import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getCurrentProfile, getTaskAttachments, getTaskById, getTaskMembers } from "@/lib/queries";
import { TaskDetail } from "@/components/tasks/task-detail";
import { TaskModalShell } from "@/components/tasks/task-modal-shell";

export default async function TaskDetailModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  await requireTool(supabase, "tasks");
  const [task, members, profile, attachments] = await Promise.all([
    getTaskById(supabase, id),
    getTaskMembers(supabase),
    getCurrentProfile(supabase),
    getTaskAttachments(supabase, id),
  ]);

  if (!task) notFound();

  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const creatorName = task.user_id ? nameById.get(task.user_id) ?? null : null;

  return (
    <TaskModalShell>
      <TaskDetail
        task={task}
        members={members}
        creatorName={creatorName}
        initialAttachments={attachments}
        currentUserId={profile?.id}
        currentUserRole={profile?.role}
        mode="modal"
      />
    </TaskModalShell>
  );
}
