"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionRow } from "@/components/transaction-list/transaction-row";
import { TransactionRowsSkeleton } from "@/components/transaction-list/transaction-rows-skeleton";
import { useMediaQuery } from "@/lib/use-media-query";
import { toIST } from "@/lib/datetime";
import type { TransactionListItem } from "@/lib/queries";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Groups are keyed by IST calendar day (not the browser/server's local
// timezone) since the backend stores UTC and only IST is shown in the UI.
function groupByDay(transactions: TransactionListItem[]) {
  const groups = new Map<string, { date: Date; items: TransactionListItem[] }>();
  for (const t of transactions) {
    const istDate = toIST(t.date_time);
    const key = format(istDate, "yyyy-MM-dd");
    const existing = groups.get(key);
    if (existing) existing.items.push(t);
    else groups.set(key, { date: istDate, items: [t] });
  }
  return Array.from(groups.entries());
}

function dayLabel(date: Date, todayKey: string, yesterdayKey: string) {
  const key = format(date, "yyyy-MM-dd");
  if (key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";
  return format(date, "EEEE, d MMM");
}

export function TransactionList({
  transactions,
  applied,
  emptyTitle = "No transactions yet",
  emptyDescription = "Start by adding your first expense, income, or transfer.",
}: {
  transactions: TransactionListItem[];
  applied: { type: string; project: string; from: string; to: string };
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const searchParams = useSearchParams();
  const urlType = searchParams.get("type");
  const normalizedType =
    urlType === "expense" || urlType === "income" || urlType === "transfer" ? urlType : "";
  const listPending =
    normalizedType !== applied.type ||
    (searchParams.get("project") ?? "") !== applied.project ||
    (searchParams.get("from") ?? "") !== applied.from ||
    (searchParams.get("to") ?? "") !== applied.to;
  // Desktop has room for pagination controls and enough transactions on
  // screen that "just keep scrolling" stops being the friendlier option;
  // mobile keeps the single continuous list.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // Reset to page 1 whenever the filtered dataset changes (new prop
  // reference from the server), without a useEffect render waterfall.
  const [renderedTransactions, setRenderedTransactions] = useState(transactions);
  if (transactions !== renderedTransactions) {
    setRenderedTransactions(transactions);
    setPage(0);
  }

  if (listPending) return <TransactionRowsSkeleton />;

  if (transactions.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <ArrowLeftRight className="size-5" />
        </div>
        <div>
          <p className="text-base font-medium">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      </Card>
    );
  }

  const pageCount = Math.max(1, Math.ceil(transactions.length / pageSize));
  const currentPage = isDesktop ? Math.min(page, pageCount - 1) : 0;
  const visible = isDesktop
    ? transactions.slice(currentPage * pageSize, currentPage * pageSize + pageSize)
    : transactions;
  const groups = groupByDay(visible);
  const nowIST = toIST(new Date());
  const todayKey = format(nowIST, "yyyy-MM-dd");
  const yesterdayKey = format(subDays(nowIST, 1), "yyyy-MM-dd");

  return (
    <div className="flex flex-col">
      {groups.map(([dateKey, { date, items }]) => (
        <div key={dateKey}>
          <p className="px-4 pb-1 pt-4 text-xs text-muted-foreground">
            {dayLabel(date, todayKey, yesterdayKey)}
          </p>
          <div className="divide-y divide-border">
            {items.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
        </div>
      ))}

      {isDesktop ? (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Page {currentPage + 1} of {pageCount}</span>
            <span className="text-border">·</span>
            <label className="flex items-center gap-1.5">
              Rows per page
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(0);
                }}
              >
                <SelectTrigger size="sm" className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          {pageCount > 1 ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage >= pageCount - 1}
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
