import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getTransactionsForRecords, getProjects } from "@/lib/queries";
import { istDayStartUtc, istDayEndUtc } from "@/lib/datetime";
import { TransactionList } from "@/components/transaction-list/transaction-list";
import { TransactionFilterSheet } from "@/components/transaction-list/transaction-filter-sheet";
import { TransactionExportDialog } from "@/components/transaction-list/transaction-export-dialog";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: undefined, label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
] as const;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; project?: string; from?: string; to?: string }>;
}) {
  const { type, project, from, to } = await searchParams;
  const activeType =
    type === "expense" || type === "income" || type === "transfer" ? type : undefined;

  const supabase = await createClient();
  await requireTool(supabase, "ledger");
  const [transactions, projects] = await Promise.all([
    getTransactionsForRecords(supabase, {
      type: activeType,
      projectId: project,
      from: from ? istDayStartUtc(from).toISOString() : undefined,
      to: to ? istDayEndUtc(to).toISOString() : undefined,
    }),
    getProjects(supabase),
  ]);
  const emptyTitle = activeType ? `No ${activeType} transactions yet` : "No transactions yet";
  const emptyDescription = activeType
    ? `Transactions you add of this type will show up here.`
    : "Start by adding your first expense, income, or transfer.";

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Transactions</h1>
        <div className="flex items-center gap-2">
          <TransactionExportDialog
            activeType={activeType}
            activeProjectId={project}
            activeFrom={from}
            activeTo={to}
          />
          <TransactionFilterSheet
            projects={projects}
            activeType={activeType}
            activeProjectId={project}
            activeFrom={from}
            activeTo={to}
          />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((filter) => {
          const params = new URLSearchParams();
          if (filter.value) params.set("type", filter.value);
          if (project) params.set("project", project);
          if (from) params.set("from", from);
          if (to) params.set("to", to);
          const query = params.toString();
          return (
          <Link
            key={filter.label}
            href={query ? `/transactions?${query}` : "/transactions"}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
              activeType === filter.value
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground"
            )}
          >
            {filter.label}
          </Link>
          );
        })}
      </div>
      <TransactionList
        transactions={transactions}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  );
}
