import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getVisibleTaskProjects, getProjectMembers, getAssignableSprints } from "@/lib/queries";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { TaskModalShell } from "@/components/tasks/task-modal-shell";

export default async function NewTaskModal({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; sprint?: string }>;
}) {
  const { project: projectId, sprint: sprintId } = await searchParams;
  if (!projectId) notFound();

  const supabase = await createClient();
  await requireTool(supabase, "tasks");
  const projects = await getVisibleTaskProjects(supabase);
  const project = projects.find((p) => p.id === projectId);
  if (!project) notFound();

  const [members, sprints] = await Promise.all([
    getProjectMembers(supabase, projectId),
    getAssignableSprints(supabase, projectId),
  ]);
  const initialSprintId = sprints.some((s) => s.id === sprintId) ? sprintId : undefined;

  return (
    <TaskModalShell>
      <NewTaskForm
        projectId={projectId}
        projectName={project.name}
        members={members}
        sprints={sprints}
        initialSprintId={initialSprintId}
        mode="modal"
      />
    </TaskModalShell>
  );
}
