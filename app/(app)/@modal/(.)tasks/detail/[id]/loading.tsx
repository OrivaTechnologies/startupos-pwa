import { TaskFormSkeleton } from "@/components/tasks/task-form-skeleton";
import { TaskModalShell } from "@/components/tasks/task-modal-shell";

export default function TaskDetailModalLoading() {
  return (
    <TaskModalShell>
      <TaskFormSkeleton />
    </TaskModalShell>
  );
}
