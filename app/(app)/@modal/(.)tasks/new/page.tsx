import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getTaskListName, getTaskMembers, MY_TASKS_LIST_ID } from "@/lib/queries";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { TaskModalShell } from "@/components/tasks/task-modal-shell";

export default async function NewTaskModal({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>;
}) {
  const { list } = await searchParams;
  const listId = list || MY_TASKS_LIST_ID;

  const supabase = await createClient();
  await requireTool(supabase, "tasks");
  const members = await getTaskMembers(supabase);

  const listName =
    listId === MY_TASKS_LIST_ID
      ? "My Tasks"
      : (await getTaskListName(supabase, listId)) ?? "Tasks";

  return (
    <TaskModalShell>
      <NewTaskForm listId={listId} listName={listName} members={members} mode="modal" />
    </TaskModalShell>
  );
}
