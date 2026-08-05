import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getHomeDashboardData, getCurrentProfile, getCashFlowSummary } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { TransactionRow } from "@/components/transaction-list/transaction-row";
import { UserAvatarLink } from "@/components/user-avatar-link";
import { CashFlowCard } from "@/components/home/cash-flow-card";
import { formatCurrency, cn } from "@/lib/utils";

const BREAKDOWN_COLORS = [
  "bg-primary",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

export default async function HomePage() {
  const supabase = await createClient();
  const access = await requireTool(supabase, "ledger");
  const [{ spent, categoryBreakdown, recentTransactions }, profile, cashFlow] =
    await Promise.all([
      getHomeDashboardData(supabase),
      getCurrentProfile(supabase),
      getCashFlowSummary(supabase),
    ]);
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long" });
  const fullName = profile?.full_name || profile?.email || "Account";
  const isEmpty = recentTransactions.length === 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Mobile only — desktop/tablet keeps profile in the sidebar. */}
      <div className="flex items-start justify-end md:hidden">
        <UserAvatarLink
          name={fullName}
          avatarUrl={profile?.avatar_url}
          currentModule="ledger"
          canSwitch={access.tools.length > 1}
        />
      </div>

      {/* Cash flow summary always renders, even with zero activity. */}
      <CashFlowCard data={cashFlow} />

      {isEmpty ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <Link
            href="/transactions/new"
            aria-label="Add your first transaction"
            className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform active:scale-95 hover:bg-primary/25"
          >
            <ArrowLeftRight className="size-7" />
          </Link>
          <div>
            <p className="text-base font-medium">No transactions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by adding your first expense,
              <br />
              income, or transfer.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between px-1 pb-1">
              <p className="text-sm font-medium">Recent activity</p>
              <Link href="/transactions" className="text-xs text-primary">
                See all
              </Link>
            </div>
            <Card className="gap-0 divide-y divide-border p-0">
              {recentTransactions.map((t) => (
                <TransactionRow key={t.id} transaction={t} />
              ))}
            </Card>
          </div>

          <Card className="gap-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Where it went</p>
              <p className="text-xs text-muted-foreground">{monthLabel}</p>
            </div>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded this month.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
                  {categoryBreakdown.map((c, i) => (
                    <div
                      key={c.name}
                      className={BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]}
                      style={{ width: `${(c.amount / spent) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  {categoryBreakdown.slice(0, 5).map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-sm">
                      <span
                        className={cn("size-2 rounded-full", BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length])}
                      />
                      <span className="flex-1 text-muted-foreground">{c.name}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
