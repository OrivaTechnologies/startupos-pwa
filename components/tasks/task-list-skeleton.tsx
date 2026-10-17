import { Skeleton } from "@/components/ui/skeleton";

export function TaskListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3.5">
      <span className="sr-only">Loading tasks</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-glass-border bg-glass px-5 py-4.5 shadow-lg shadow-black/20 dark:bg-card/50"
        >
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="mt-3 h-4 w-11/12" />
          <Skeleton className="mt-1.5 h-4 w-2/3" />
          <div className="mt-3 flex items-center gap-3">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
