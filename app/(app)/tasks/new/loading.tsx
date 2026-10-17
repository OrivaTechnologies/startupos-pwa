import { TaskFormSkeleton } from "@/components/tasks/task-form-skeleton";

export default function NewTaskLoading() {
  return (
    <div className="tasks-theme flex h-svh flex-col">
      <TaskFormSkeleton />
    </div>
  );
}
