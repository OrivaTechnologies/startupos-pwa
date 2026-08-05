import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getCurrentProfile, getVisibleTaskProjects, getSprints } from "@/lib/queries";
import { resolveProjectId } from "@/lib/task-projects";
import { SprintBoard } from "@/components/sprints/sprint-board";
import { NoProjectsEmptyState } from "@/components/tasks/no-projects-empty-state";

export default async function SprintsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const supabase = await createClient();
  await requireTool(supabase, "tasks");
  const [profile, projects] = await Promise.all([
    getCurrentProfile(supabase),
    getVisibleTaskProjects(supabase),
  ]);
  const isAdmin = profile?.role === "admin";
  const projectId = resolveProjectId(projects, project);
  const projectName = projects.find((p) => p.id === projectId)?.name;
  const sprints = projectId ? await getSprints(supabase, projectId) : [];

  return (
    <div className="tasks-theme mx-auto flex w-full max-w-none flex-col px-4 py-6">
      <h1 className="pb-4 text-xl font-semibold">
        {projectName ? `${projectName} · Sprints` : "Sprints"}
      </h1>
      {projectId ? (
        <SprintBoard projectId={projectId} sprints={sprints} isAdmin={isAdmin} />
      ) : (
        <NoProjectsEmptyState isAdmin={isAdmin} />
      )}
    </div>
  );
}
