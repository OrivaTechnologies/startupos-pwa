import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getAnalysisData } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { AnalysisSummary } from "@/components/analysis/analysis-summary";
import { MonthlyBarChart } from "@/components/analysis/monthly-bar-chart";

export default async function AnalysisPage() {
  const supabase = await createClient();
  const [, { monthly, byPeriod, totalBalance, hasActivity }] = await Promise.all([
    requireTool(supabase, "ledger"),
    getAnalysisData(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-lg font-semibold">Analysis</h1>

      {!hasActivity ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <p className="text-base font-medium">No analytics available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add transactions to view reports, trends, and spending
              breakdowns.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <AnalysisSummary byPeriod={byPeriod} totalBalance={totalBalance} />

          <Card className="gap-4 p-4">
            <p className="text-sm font-medium">Income vs expense · last 6 months</p>
            <MonthlyBarChart data={monthly} />
          </Card>
        </>
      )}
    </div>
  );
}
