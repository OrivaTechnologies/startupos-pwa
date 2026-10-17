import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getTaskMembers } from "@/lib/queries";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { TaskModalShell } from "@/components/tasks/task-modal-shell";

export default async function NewTaskModal() {
  const supabase = await createClient();
  const [, members] = await Promise.all([
    requireTool(supabase, "tasks"),
    getTaskMembers(supabase),
  ]);

  return (
    <TaskModalShell>
      <NewTaskForm members={members} mode="modal" />
    </TaskModalShell>
  );
}
