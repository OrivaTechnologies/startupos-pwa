import { Skeleton } from "@/components/ui/skeleton";

export function TransactionRowsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col">
      <span className="sr-only">Loading transactions</span>
      {Array.from({ length: 2 }).map((_, groupIndex) => (
        <div key={groupIndex}>
          <Skeleton className="mx-1 mt-4 mb-1 h-3 w-20" />
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-3.5 w-14" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
