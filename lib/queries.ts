import "server-only";
import {
  startOfMonth,
  startOfYear,
  endOfMonth,
  subMonths,
  format,
  differenceInCalendarDays,
  differenceInCalendarMonths,
} from "date-fns";
import type { createClient } from "@/lib/supabase/server";
import type { TaskStatus, TaskType, TaskPriority, SprintStatus } from "@/lib/supabase/types";
import type { ProjectSummary } from "@/lib/task-projects";
import type { SprintSummary } from "@/lib/sprints";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Tasks that have sat in "done" longer than this are hidden from list views
// (still reachable directly by URL via getTaskById).
const DONE_TASK_VISIBILITY_DAYS = 30;

export async function getCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_archived", false)
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getProjects(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("is_archived", false)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getTags(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getAccountsWithPaymentModes(supabase: SupabaseClient) {
  const [{ data: accounts, error: accountsError }, { data: modes, error: modesError }, { data: balances, error: balancesError }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .eq("is_archived", false)
        .order("sort_order"),
      supabase
        .from("payment_modes")
        .select("*")
        .eq("is_archived", false)
        .order("sort_order"),
      supabase.from("account_balances").select("*"),
    ]);
  if (accountsError) throw accountsError;
  if (modesError) throw modesError;
  if (balancesError) throw balancesError;

  const balanceByAccount = new Map(balances.map((b) => [b.account_id, b.balance]));

  return accounts.map((account) => {
    const paymentModes = modes.filter((m) => m.account_id === account.id);
    const balance = account.opening_balance + (balanceByAccount.get(account.id) ?? 0);
    return { ...account, paymentModes, balance };
  });
}

export async function getPaymentModes(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("payment_modes")
    .select("*, accounts(name)")
    .eq("is_archived", false)
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getTransactionFormData(supabase: SupabaseClient) {
  const [categories, projects, accounts, tags, defaultAccount] = await Promise.all([
    getCategories(supabase),
    getProjects(supabase),
    getAccountsWithPaymentModes(supabase),
    getTags(supabase),
    getDefaultAccount(supabase),
  ]);

  return {
    categories,
    projects,
    accounts,
    tagNames: tags.map((t) => t.name),
    defaultAccountId: defaultAccount?.id,
  };
}

export async function getTransactionWithTags(supabase: SupabaseClient, id: string) {
  const [{ data: transaction, error: transactionError }, { data: tagLinks, error: tagLinksError }] =
    await Promise.all([
      supabase.from("transactions").select("*").eq("id", id).maybeSingle(),
      supabase.from("transaction_tags").select("tags(name)").eq("transaction_id", id),
    ]);
  if (transactionError) throw transactionError;
  if (tagLinksError) throw tagLinksError;
  if (!transaction) return null;

  const tags = (tagLinks ?? [])
    .map((link) => (link as unknown as { tags: { name: string } | null }).tags?.name)
    .filter((name): name is string => Boolean(name));

  return { transaction, tags };
}

export interface ReceiptWithUrl {
  id: string;
  file_name: string | null;
  content_type: string | null;
  signedUrl: string | null;
}

// The receipts bucket is private (see 0002_rls_policies.sql), so every read
// needs a short-lived signed URL rather than a public one.
const RECEIPT_SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function getReceiptsForTransaction(
  supabase: SupabaseClient,
  transactionId: string
): Promise<ReceiptWithUrl[]> {
  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("id, file_name, content_type, storage_path")
    .eq("transaction_id", transactionId)
    .order("uploaded_at");
  console.log(
    `[getReceiptsForTransaction] transactionId=${transactionId} error=${error?.message ?? null} rows=`,
    receipts
  );
  if (error) throw error;
  if (!receipts || receipts.length === 0) return [];

  const { data: signed, error: signError } = await supabase.storage
    .from("receipts")
    .createSignedUrls(
      receipts.map((r) => r.storage_path),
      RECEIPT_SIGNED_URL_TTL_SECONDS
    );
  console.log(
    "[getReceiptsForTransaction] createSignedUrls error=",
    signError,
    "signed=",
    signed
  );

  return receipts.map((r, i) => ({
    id: r.id,
    file_name: r.file_name,
    content_type: r.content_type,
    signedUrl: signed?.[i]?.signedUrl ?? null,
  }));
}

export interface TransactionListItem {
  id: string;
  transaction_type: "expense" | "income" | "transfer";
  amount: number;
  currency: string;
  date_time: string;
  status: "recorded" | "reconciled";
  notes: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  projectName: string | null;
  accountName: string;
  destinationAccountName: string | null;
}

async function attachLookups(
  supabase: SupabaseClient,
  transactions: {
    id: string;
    transaction_type: "expense" | "income" | "transfer";
    amount: number;
    currency: string;
    date_time: string;
    status: "recorded" | "reconciled";
    notes: string | null;
    category_id: string | null;
    project_id: string | null;
    account_id: string;
    destination_account_id: string | null;
  }[]
): Promise<TransactionListItem[]> {
  const [categories, { data: accounts, error }, { data: projects, error: projectsError }] =
    await Promise.all([
      getCategories(supabase),
      supabase.from("accounts").select("id, name"),
      supabase.from("projects").select("id, name"),
    ]);
  if (error) throw error;
  if (projectsError) throw projectsError;

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  return transactions.map((t) => ({
    id: t.id,
    transaction_type: t.transaction_type,
    amount: t.amount,
    currency: t.currency,
    date_time: t.date_time,
    status: t.status,
    notes: t.notes,
    categoryName: t.category_id ? categoryById.get(t.category_id)?.name ?? null : null,
    categoryIcon: t.category_id ? categoryById.get(t.category_id)?.icon ?? null : null,
    projectName: t.project_id ? projectById.get(t.project_id)?.name ?? null : null,
    accountName: accountById.get(t.account_id)?.name ?? "—",
    destinationAccountName: t.destination_account_id
      ? accountById.get(t.destination_account_id)?.name ?? null
      : null,
  }));
}

export async function getRecentTransactions(supabase: SupabaseClient, limit: number) {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, transaction_type, amount, currency, date_time, status, notes, category_id, project_id, account_id, destination_account_id"
    )
    .order("date_time", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return attachLookups(supabase, data);
}

export async function getTransactionsForRecords(
  supabase: SupabaseClient,
  filters?: {
    type?: "expense" | "income" | "transfer";
    projectId?: string;
    from?: string;
    to?: string;
  }
) {
  let query = supabase
    .from("transactions")
    .select(
      "id, transaction_type, amount, currency, date_time, status, notes, category_id, project_id, account_id, destination_account_id"
    )
    .order("date_time", { ascending: false });
  if (filters?.type) query = query.eq("transaction_type", filters.type);
  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.from) query = query.gte("date_time", filters.from);
  if (filters?.to) query = query.lte("date_time", filters.to);

  const { data, error } = await query;
  if (error) throw error;
  return attachLookups(supabase, data);
}

export async function getHomeDashboardData(supabase: SupabaseClient) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: monthTransactions, error }, recentTransactions, categories] = await Promise.all([
    supabase
      .from("transactions")
      .select("transaction_type, amount, category_id, date_time")
      .gte("date_time", monthStart),
    getRecentTransactions(supabase, 5),
    getCategories(supabase),
  ]);
  if (error) throw error;

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  let income = 0;
  let spent = 0;
  const spentByCategory = new Map<string, number>();

  for (const t of monthTransactions) {
    if (t.transaction_type === "income") {
      income += t.amount;
    } else if (t.transaction_type === "expense") {
      spent += t.amount;
      const name = t.category_id ? categoryById.get(t.category_id)?.name ?? "Others" : "Others";
      spentByCategory.set(name, (spentByCategory.get(name) ?? 0) + t.amount);
    }
  }

  const categoryBreakdown = Array.from(spentByCategory.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    netFlow: income - spent,
    income,
    spent,
    categoryBreakdown,
    recentTransactions,
  };
}

export type CashFlowPeriod = "thisMonth" | "thisYear" | "allTime";

export interface CashFlowTotals {
  income: number;
  spending: number;
  netBalance: number;
}

export async function getCashFlowSummary(
  supabase: SupabaseClient
): Promise<Record<CashFlowPeriod, CashFlowTotals>> {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const yearStart = startOfYear(now).toISOString();

  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_type, amount, date_time");
  if (error) throw error;
  const rows = data ?? [];

  function totalsSince(fromIso: string | null): CashFlowTotals {
    let income = 0;
    let spending = 0;
    for (const t of rows) {
      if (fromIso && t.date_time < fromIso) continue;
      if (t.transaction_type === "income") income += t.amount;
      else if (t.transaction_type === "expense") spending += t.amount;
    }
    return { income, spending, netBalance: income - spending };
  }

  return {
    thisMonth: totalsSince(monthStart),
    thisYear: totalsSince(yearStart),
    allTime: totalsSince(null),
  };
}

export interface AnalysisPeriodStats {
  spend: number;
  income: number;
  count: number;
  avgDailySpend: number;
  avgMonthlySpend: number;
  categoryBreakdown: { name: string; amount: number }[];
}

export async function getAnalysisData(supabase: SupabaseClient) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisYearStart = startOfYear(now);

  const [{ data: transactionRows, error }, categories, accounts] = await Promise.all([
    supabase.from("transactions").select("transaction_type, amount, category_id, date_time"),
    getCategories(supabase),
    getAccountsWithPaymentModes(supabase),
  ]);
  if (error) throw error;
  const transactions = transactionRows ?? [];

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  // Trend chart always shows the last 6 months regardless of the selected
  // period filter below — it's a fixed-window view, not a filtered total.
  const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
  const monthly = months.map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      const d = new Date(t.date_time);
      if (d >= monthStart && d <= monthEnd) {
        if (t.transaction_type === "income") income += t.amount;
        else if (t.transaction_type === "expense") expense += t.amount;
      }
    }
    return { label: format(monthStart, "MMM"), income, expense };
  });

  function statsSince(
    fromDate: Date | null,
    daysInPeriod: number,
    monthsInPeriod: number
  ): AnalysisPeriodStats {
    let income = 0;
    let spend = 0;
    let count = 0;
    const spendByCategory = new Map<string, number>();
    for (const t of transactions) {
      const d = new Date(t.date_time);
      if (fromDate && d < fromDate) continue;
      count += 1;
      if (t.transaction_type === "income") {
        income += t.amount;
      } else if (t.transaction_type === "expense") {
        spend += t.amount;
        const name = t.category_id ? categoryById.get(t.category_id)?.name ?? "Others" : "Others";
        spendByCategory.set(name, (spendByCategory.get(name) ?? 0) + t.amount);
      }
    }
    const categoryBreakdown = Array.from(spendByCategory.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
    return {
      income,
      spend,
      count,
      avgDailySpend: spend / daysInPeriod,
      avgMonthlySpend: spend / monthsInPeriod,
      categoryBreakdown,
    };
  }

  const earliestTransaction = transactions.reduce<Date | null>((earliest, t) => {
    const d = new Date(t.date_time);
    return !earliest || d < earliest ? d : earliest;
  }, null);

  const byPeriod: Record<CashFlowPeriod, AnalysisPeriodStats> = {
    thisMonth: statsSince(thisMonthStart, differenceInCalendarDays(now, thisMonthStart) + 1, 1),
    thisYear: statsSince(
      thisYearStart,
      differenceInCalendarDays(now, thisYearStart) + 1,
      differenceInCalendarMonths(now, thisYearStart) + 1
    ),
    allTime: statsSince(
      null,
      earliestTransaction ? differenceInCalendarDays(now, earliestTransaction) + 1 : 1,
      earliestTransaction ? differenceInCalendarMonths(now, earliestTransaction) + 1 : 1
    ),
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return {
    monthly,
    byPeriod,
    totalBalance,
    hasActivity: transactions.length > 0,
  };
}

export async function getCurrentProfile(supabase: SupabaseClient) {
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface TaskMember {
  id: string;
  name: string;
  avatarUrl: string | null;
}

// Logs the full Postgres/PostgREST error (code, message, details, hint) to
// the server console before re-throwing, since the client error boundary
// only surfaces a collapsed/sanitized version of thrown Server Component
// errors — this is the only reliable way to see the real cause from the
// `next dev` terminal.
function logAndThrow(context: string, error: unknown, extra?: Record<string, unknown>): never {
  console.error(`[queries] ${context} failed`, { error, ...extra });
  throw error;
}

export async function getTaskMembers(supabase: SupabaseClient): Promise<TaskMember[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .order("full_name");
  if (error) logAndThrow("getTaskMembers", error);
  return data.map((p) => ({
    id: p.id,
    name: p.full_name || p.email,
    avatarUrl: p.avatar_url,
  }));
}

// The project-avatars bucket is private (see 0017_project_avatar_and_key.sql),
// so every read needs a short-lived signed URL rather than a public one.
const PROJECT_AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 60;

// Every visible project (RLS already filters this to the caller's own
// memberships, or every project for an admin — see is_task_project_member()
// in 0016_task_projects.sql).
export async function getVisibleTaskProjects(supabase: SupabaseClient): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("task_projects")
    .select("id, name, key_prefix, avatar_path")
    .order("created_at");
  if (error) logAndThrow("getVisibleTaskProjects", error);

  const pathsNeedingUrls = data
    .map((p) => p.avatar_path)
    .filter((path): path is string => path !== null);

  const urlByPath = new Map<string, string>();
  if (pathsNeedingUrls.length > 0) {
    const { data: signed } = await supabase.storage
      .from("project-avatars")
      .createSignedUrls(pathsNeedingUrls, PROJECT_AVATAR_SIGNED_URL_TTL_SECONDS);
    signed?.forEach((s, i) => {
      if (s.signedUrl) urlByPath.set(pathsNeedingUrls[i], s.signedUrl);
    });
  }

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    keyPrefix: p.key_prefix,
    avatarUrl: p.avatar_path ? urlByPath.get(p.avatar_path) ?? null : null,
  }));
}

// Used by the project Edit dialog to decide whether Delete is safe to offer.
export async function getProjectDeletionBlockers(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ sprintCount: number; taskCount: number }> {
  const [{ count: sprintCount, error: sprintError }, { count: taskCount, error: taskError }] =
    await Promise.all([
      supabase.from("sprints").select("id", { count: "exact", head: true }).eq("project_id", projectId),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    ]);
  if (sprintError) logAndThrow("getProjectDeletionBlockers (sprints)", sprintError, { projectId });
  if (taskError) logAndThrow("getProjectDeletionBlockers (tasks)", taskError, { projectId });
  return { sprintCount: sprintCount ?? 0, taskCount: taskCount ?? 0 };
}

// A project's Members — the pool a task's assignee must come from.
export async function getProjectMembers(
  supabase: SupabaseClient,
  projectId: string
): Promise<TaskMember[]> {
  const { data, error } = await supabase
    .from("task_project_members")
    .select("profiles(id, full_name, email, avatar_url)")
    .eq("project_id", projectId);
  if (error) logAndThrow("getProjectMembers", error, { projectId });
  return (data as unknown as { profiles: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null }[])
    .map((row) => row.profiles)
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({ id: p.id, name: p.full_name || p.email, avatarUrl: p.avatar_url }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface BacklogTask {
  id: string;
  number: number;
  title: string;
  description: string | null;
  due_at: string | null;
  status: TaskStatus;
  task_type: TaskType;
  priority: TaskPriority;
  sprint_id: string | null;
  user_id: string;
  assignee_id: string | null;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
}

// A project's Backlog — tasks not (yet) assigned to any sprint.
export async function getBacklogTasks(
  supabase: SupabaseClient,
  projectId: string
): Promise<BacklogTask[]> {
  const doneCutoff = new Date(
    Date.now() - DONE_TASK_VISIBILITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [{ data: tasks, error: tasksError }, members] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, number, title, description, due_at, status, task_type, priority, sprint_id, user_id, assignee_id"
      )
      .eq("project_id", projectId)
      .is("sprint_id", null)
      // Hide tasks that have been done for more than DONE_TASK_VISIBILITY_DAYS.
      .or(`status.neq.done,completed_at.gte.${doneCutoff}`)
      .order("created_at"),
    getProjectMembers(supabase, projectId),
  ]);
  if (tasksError) logAndThrow("getBacklogTasks", tasksError, { projectId });

  // Stable sort: done tasks sink to the bottom, todo/in_progress keep their
  // creation order.
  tasks.sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));

  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const avatarById = new Map(members.map((m) => [m.id, m.avatarUrl]));

  return tasks.map((t) => ({
    ...t,
    assigneeName: t.assignee_id ? nameById.get(t.assignee_id) ?? null : null,
    assigneeAvatarUrl: t.assignee_id ? avatarById.get(t.assignee_id) ?? null : null,
  }));
}

export interface TaskDetailData {
  id: string;
  number: number;
  project_id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: TaskStatus;
  task_type: TaskType;
  priority: TaskPriority;
  sprint_id: string | null;
  user_id: string;
  assignee_id: string | null;
  created_at: string;
}

export async function getTaskById(
  supabase: SupabaseClient,
  id: string
): Promise<TaskDetailData | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, number, project_id, title, description, due_at, status, task_type, priority, sprint_id, user_id, assignee_id, created_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) logAndThrow("getTaskById", error, { id });
  return data;
}

export async function getSprints(
  supabase: SupabaseClient,
  projectId: string
): Promise<SprintSummary[]> {
  const { data, error } = await supabase
    .from("sprints")
    .select("id, number, start_date, end_date, status")
    .eq("project_id", projectId)
    .order("number");
  if (error) logAndThrow("getSprints", error, { projectId });
  return data;
}

// Sprints a task can be assigned to at create/edit time — the active sprint
// plus any queued-up upcoming ones in the same project. Closed sprints are
// historical only.
export async function getAssignableSprints(
  supabase: SupabaseClient,
  projectId: string
): Promise<SprintSummary[]> {
  const { data, error } = await supabase
    .from("sprints")
    .select("id, number, start_date, end_date, status")
    .eq("project_id", projectId)
    .in("status", ["active", "upcoming"] satisfies SprintStatus[])
    .order("number");
  if (error) logAndThrow("getAssignableSprints", error, { projectId });
  return data;
}

export interface BoardTask {
  id: string;
  number: number;
  title: string;
  status: TaskStatus;
  task_type: TaskType;
  priority: TaskPriority;
  due_at: string | null;
  user_id: string;
  assignee_id: string | null;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
}

export interface ActiveSprintBoard {
  sprint: SprintSummary | null;
  tasks: BoardTask[];
}

// Powers the Jira-style board — the project's active sprint tasks, grouped
// client-side into to-do/in-progress/done columns.
export async function getActiveSprintBoardTasks(
  supabase: SupabaseClient,
  projectId: string
): Promise<ActiveSprintBoard> {
  const { data: sprint, error: sprintError } = await supabase
    .from("sprints")
    .select("id, number, start_date, end_date, status")
    .eq("project_id", projectId)
    .eq("status", "active")
    .maybeSingle();
  if (sprintError) logAndThrow("getActiveSprintBoardTasks (sprint lookup)", sprintError, { projectId });
  if (!sprint) return { sprint: null, tasks: [] };

  const [{ data: tasks, error: tasksError }, members] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, number, title, status, task_type, priority, due_at, user_id, assignee_id")
      .eq("sprint_id", sprint.id)
      .order("created_at"),
    getProjectMembers(supabase, projectId),
  ]);
  if (tasksError) {
    logAndThrow("getActiveSprintBoardTasks (tasks lookup)", tasksError, { projectId, sprintId: sprint.id });
  }

  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const avatarById = new Map(members.map((m) => [m.id, m.avatarUrl]));

  return {
    sprint,
    tasks: tasks.map((t) => ({
      ...t,
      assigneeName: t.assignee_id ? nameById.get(t.assignee_id) ?? null : null,
      assigneeAvatarUrl: t.assignee_id ? avatarById.get(t.assignee_id) ?? null : null,
    })),
  };
}

export async function getSprintById(
  supabase: SupabaseClient,
  id: string
): Promise<SprintSummary | null> {
  const { data, error } = await supabase
    .from("sprints")
    .select("id, number, start_date, end_date, status")
    .eq("id", id)
    .maybeSingle();
  if (error) logAndThrow("getSprintById", error, { id });
  return data;
}

export interface TaskAttachmentWithUrl {
  id: string;
  file_name: string | null;
  content_type: string | null;
  signedUrl: string | null;
}

// The task-attachments bucket is private (see 0014_task_attachments.sql), so
// every read needs a short-lived signed URL rather than a public one.
const TASK_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function getTaskAttachments(
  supabase: SupabaseClient,
  taskId: string
): Promise<TaskAttachmentWithUrl[]> {
  const { data: attachments, error } = await supabase
    .from("task_attachments")
    .select("id, file_name, content_type, storage_path")
    .eq("task_id", taskId)
    .order("uploaded_at");
  // Fails soft (e.g. the 0014 migration hasn't been applied to this
  // database yet) rather than crashing the whole task detail page over a
  // feature that's allowed to just not have any attachments yet.
  if (error) {
    console.error("[getTaskAttachments] error:", error.message);
    return [];
  }
  if (!attachments || attachments.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from("task-attachments")
    .createSignedUrls(
      attachments.map((a) => a.storage_path),
      TASK_ATTACHMENT_SIGNED_URL_TTL_SECONDS
    );

  return attachments.map((a, i) => ({
    id: a.id,
    file_name: a.file_name,
    content_type: a.content_type,
    signedUrl: signed?.[i]?.signedUrl ?? null,
  }));
}

export async function getDefaultAccount(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
