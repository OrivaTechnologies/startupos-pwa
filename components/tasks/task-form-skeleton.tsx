import { Skeleton } from "@/components/ui/skeleton";

export function TaskFormSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4 p-4">
      <span className="sr-only">Loading task</span>
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-5 w-28" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}
