import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import {
  getCurrentProfile,
  getTaskAttachments,
  getTaskById,
  getProjectMembers,
  getVisibleTaskProjects,
  getAssignableSprints,
  getSprintById,
} from "@/lib/queries";
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
  const task = await getTaskById(supabase, id);
  if (!task) notFound();

  const [members, profile, attachments, assignableSprints, projects] = await Promise.all([
    getProjectMembers(supabase, task.project_id),
    getCurrentProfile(supabase),
    getTaskAttachments(supabase, id),
    getAssignableSprints(supabase, task.project_id),
    getVisibleTaskProjects(supabase),
  ]);
  const keyPrefix = projects.find((p) => p.id === task.project_id)?.keyPrefix ?? "TASK";

  let sprints = assignableSprints;
  if (task.sprint_id && !assignableSprints.some((s) => s.id === task.sprint_id)) {
    const ownSprint = await getSprintById(supabase, task.sprint_id);
    if (ownSprint) sprints = [...assignableSprints, ownSprint];
  }

  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const creatorName = task.user_id ? nameById.get(task.user_id) ?? null : null;

  return (
    <TaskModalShell>
      <TaskDetail
        task={task}
        keyPrefix={keyPrefix}
        members={members}
        sprints={sprints}
        creatorName={creatorName}
        initialAttachments={attachments}
        currentUserId={profile?.id}
        currentUserRole={profile?.role}
        mode="modal"
      />
    </TaskModalShell>
  );
}
