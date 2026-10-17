import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getTransactionsForRecords, getProjects } from "@/lib/queries";
import { istDayStartUtc, istDayEndUtc } from "@/lib/datetime";
import { TransactionList } from "@/components/transaction-list/transaction-list";
import { TransactionTypeTabs } from "@/components/transaction-list/transaction-type-tabs";
import { TransactionRowsSkeleton } from "@/components/transaction-list/transaction-rows-skeleton";
import { TransactionFilterSheet } from "@/components/transaction-list/transaction-filter-sheet";
import { TransactionExportDialog } from "@/components/transaction-list/transaction-export-dialog";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; project?: string; from?: string; to?: string }>;
}) {
  const { type, project, from, to } = await searchParams;
  const activeType =
    type === "expense" || type === "income" || type === "transfer" ? type : undefined;

  const supabase = await createClient();
  const [, transactions, projects] = await Promise.all([
    requireTool(supabase, "ledger"),
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
      <Suspense fallback={<div className="h-8" />}>
        <TransactionTypeTabs />
      </Suspense>
      <Suspense fallback={<TransactionRowsSkeleton />}>
        <TransactionList
          transactions={transactions}
          applied={{
            type: activeType ?? "",
            project: project ?? "",
            from: from ?? "",
            to: to ?? "",
          }}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </Suspense>
    </div>
  );
}
