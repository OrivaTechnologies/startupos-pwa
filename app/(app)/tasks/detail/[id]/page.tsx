import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getCurrentProfile, getTaskAttachments, getTaskById, getTaskMembers } from "@/lib/queries";
import { TaskDetail } from "@/components/tasks/task-detail";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [, task, members, profile, attachments] = await Promise.all([
    requireTool(supabase, "tasks"),
    getTaskById(supabase, id),
    getTaskMembers(supabase),
    getCurrentProfile(supabase),
    getTaskAttachments(supabase, id),
  ]);
  if (!task) notFound();

  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const creatorName = task.user_id ? nameById.get(task.user_id) ?? null : null;

  return (
    <div className="tasks-theme flex h-svh flex-col">
      <TaskDetail
        task={task}
        members={members}
        creatorName={creatorName}
        initialAttachments={attachments}
        currentUserId={profile?.id}
        currentUserRole={profile?.role}
        mode="page"
      />
    </div>
  );
}
