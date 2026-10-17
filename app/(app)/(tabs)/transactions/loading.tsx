import { Skeleton } from "@/components/ui/skeleton";
import { TransactionRowsSkeleton } from "@/components/transaction-list/transaction-rows-skeleton";

export default function TransactionsLoading() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="size-8 shrink-0 rounded-full" />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 shrink-0 rounded-full" />
        ))}
      </div>
      <TransactionRowsSkeleton />
    </div>
  );
}
