import { TaskFormSkeleton } from "@/components/tasks/task-form-skeleton";
import { TaskModalShell } from "@/components/tasks/task-modal-shell";

export default function NewTaskModalLoading() {
  return (
    <TaskModalShell>
      <TaskFormSkeleton />
    </TaskModalShell>
  );
}
