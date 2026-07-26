import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col md:max-w-none md:items-center md:pt-10 md:pb-10">
      <div className="flex items-center gap-3 border-b border-glass-border bg-glass px-4 py-3 backdrop-blur-xl md:hidden dark:bg-card/50">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="w-full md:max-w-xl md:rounded-2xl md:border md:border-glass-border md:bg-glass md:p-6 md:shadow-lg md:shadow-black/20 md:backdrop-blur-xl dark:md:bg-card/50">
        <Skeleton className="mb-6 hidden h-6 w-20 md:block" />

        <div className="flex flex-col items-center gap-3 px-4 pt-8 pb-4 md:flex-row md:px-0 md:pt-0 md:pb-6">
          <Skeleton className="size-20 rounded-full" />
          <div className="flex flex-col items-center gap-2 md:items-start">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4 pt-4 md:px-0 md:pt-0">
          <Card className="gap-0 divide-y divide-border p-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-4 shrink-0 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-1.5 h-3.5 w-28" />
                </div>
              </div>
            ))}
          </Card>

          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
