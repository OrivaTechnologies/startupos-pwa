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
import type { TaskStatus } from "@/lib/supabase/types";
import { MY_TASKS_LIST_ID, type TaskListSummary } from "@/lib/tasks";

export { MY_TASKS_LIST_ID } from "@/lib/tasks";

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

export async function getTaskMembers(supabase: SupabaseClient): Promise<TaskMember[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .order("full_name");
  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    name: p.full_name || p.email,
    avatarUrl: p.avatar_url,
  }));
}

export interface TaskListWithTasks {
  id: string;
  name: string;
  isVirtual: boolean;
  user_id: string | null;
  tasks: {
    id: string;
    title: string;
    description: string | null;
    due_at: string | null;
    status: TaskStatus;
    user_id: string;
    assignee_id: string | null;
    assigneeName: string | null;
    assigneeAvatarUrl: string | null;
  }[];
}

export async function getTaskListsWithTasks(
  supabase: SupabaseClient
): Promise<TaskListWithTasks[]> {
  const doneCutoff = new Date(
    Date.now() - DONE_TASK_VISIBILITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    { data: lists, error: listsError },
    { data: tasks, error: tasksError },
    members,
  ] = await Promise.all([
    supabase
      .from("task_lists")
      .select("id, name, user_id")
      .order("created_at"),
    supabase
      .from("tasks")
      .select("id, list_id, title, description, due_at, status, user_id, assignee_id")
      // Hide tasks that have been done for more than DONE_TASK_VISIBILITY_DAYS.
      .or(`status.neq.done,completed_at.gte.${doneCutoff}`)
      .order("created_at"),
    getTaskMembers(supabase),
  ]);
  if (listsError) throw listsError;
  if (tasksError) throw tasksError;

  // Stable sort: done tasks sink to the bottom, todo/in_progress keep their
  // creation order.
  tasks.sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));

  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const avatarById = new Map(members.map((m) => [m.id, m.avatarUrl]));
  const withAssignee = (t: (typeof tasks)[number]) => ({
    ...t,
    assigneeName: t.assignee_id ? nameById.get(t.assignee_id) ?? null : null,
    assigneeAvatarUrl: t.assignee_id ? avatarById.get(t.assignee_id) ?? null : null,
  });

  const myTasks: TaskListWithTasks = {
    id: MY_TASKS_LIST_ID,
    name: "My Tasks",
    isVirtual: true,
    user_id: null,
    tasks: tasks.filter((t) => t.list_id === null).map(withAssignee),
  };

  const realLists: TaskListWithTasks[] = lists.map((list) => ({
    ...list,
    isVirtual: false,
    tasks: tasks.filter((t) => t.list_id === list.id).map(withAssignee),
  }));

  return [myTasks, ...realLists];
}

// Lighter than getTaskListsWithTasks — just names for nav (the sidebar),
// without joining every list's tasks.
export async function getTaskListSummaries(
  supabase: SupabaseClient
): Promise<TaskListSummary[]> {
  const { data, error } = await supabase
    .from("task_lists")
    .select("id, name")
    .order("created_at");
  if (error) throw error;
  return [
    { id: MY_TASKS_LIST_ID, name: "My Tasks", isVirtual: true },
    ...data.map((list) => ({ id: list.id, name: list.name, isVirtual: false })),
  ];
}

export interface TaskDetailData {
  id: string;
  list_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  status: TaskStatus;
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
    .select("id, list_id, title, description, due_at, status, user_id, assignee_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTaskListName(
  supabase: SupabaseClient,
  id: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("task_lists")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data?.name ?? null;
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
