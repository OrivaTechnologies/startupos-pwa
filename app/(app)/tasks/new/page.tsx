import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getVisibleTaskProjects, getProjectMembers, getAssignableSprints } from "@/lib/queries";
import { NewTaskForm } from "@/components/tasks/new-task-form";

export default async function NewTaskPage({
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
  // Only honor ?sprint= if it's actually one of this project's open sprints
  // — e.g. the "Add task" CTA on the Active Sprint board passes the current
  // sprint id so the task lands there instead of the backlog by default.
  const initialSprintId = sprints.some((s) => s.id === sprintId) ? sprintId : undefined;

  return (
    <div className="tasks-theme flex h-svh flex-col">
      <NewTaskForm
        projectId={projectId}
        projectName={project.name}
        members={members}
        sprints={sprints}
        initialSprintId={initialSprintId}
        mode="page"
      />
    </div>
  );
}
