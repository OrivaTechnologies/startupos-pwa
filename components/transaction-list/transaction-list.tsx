"use client";

import { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
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
import { useMediaQuery } from "@/lib/use-media-query";
import type { TransactionListItem } from "@/lib/queries";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function groupByDay(transactions: TransactionListItem[]) {
  const groups = new Map<string, TransactionListItem[]>();
  for (const t of transactions) {
    const key = format(new Date(t.date_time), "yyyy-MM-dd");
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return Array.from(groups.entries());
}

function dayLabel(dateKey: string) {
  const date = new Date(dateKey);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMM");
}

export function TransactionList({
  transactions,
  emptyTitle = "No transactions yet",
  emptyDescription = "Start by adding your first expense, income, or transfer.",
}: {
  transactions: TransactionListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
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

  return (
    <div className="flex flex-col">
      {groups.map(([dateKey, items]) => (
        <div key={dateKey}>
          <p className="px-4 pb-1 pt-4 text-xs text-muted-foreground">{dayLabel(dateKey)}</p>
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
