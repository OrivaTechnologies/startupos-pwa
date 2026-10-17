import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getTaskMembers } from "@/lib/queries";
import { NewTaskForm } from "@/components/tasks/new-task-form";

export default async function NewTaskPage() {
  const supabase = await createClient();
  await requireTool(supabase, "tasks");
  const members = await getTaskMembers(supabase);

  return (
    <div className="tasks-theme flex h-svh flex-col">
      <NewTaskForm members={members} mode="page" />
    </div>
  );
}
