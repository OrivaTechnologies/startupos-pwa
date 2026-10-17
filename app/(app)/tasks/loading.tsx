import { Skeleton } from "@/components/ui/skeleton";
import { TaskListSkeleton } from "@/components/tasks/task-list-skeleton";

export default function TasksLoading() {
  return (
    <div className="tasks-theme mx-auto flex min-h-svh w-full max-w-md flex-col pb-24 md:max-w-none md:pb-6 md:pt-2">
      <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-3 md:pt-4 md:pb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="size-9 rounded-full md:hidden" />
      </div>
      <div className="mx-4 mb-3 grid grid-cols-3 gap-1 rounded-xl bg-secondary/40 p-1 md:hidden">
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
      </div>
      <div className="mx-4 mb-3 hidden h-14 rounded-xl bg-secondary/40 md:block" />
      <div className="px-4">
        <TaskListSkeleton />
      </div>
    </div>
  );
}
