import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getCurrentProfile, getVisibleTaskProjects, getProjectMembers, getTaskMembers } from "@/lib/queries";
import { resolveProjectId } from "@/lib/task-projects";
import { ProjectMembers } from "@/components/tasks/project-members";
import { NoProjectsEmptyState } from "@/components/tasks/no-projects-empty-state";

export default async function ProjectMembersPage({
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

  const [members, allProfiles] = projectId
    ? await Promise.all([getProjectMembers(supabase, projectId), getTaskMembers(supabase)])
    : [[], []];

  return (
    <div className="tasks-theme mx-auto flex w-full max-w-none flex-col px-4 py-6">
      <h1 className="pb-4 text-xl font-semibold">
        {projectName ? `${projectName} · Members` : "Members"}
      </h1>
      {projectId ? (
        <ProjectMembers
          projectId={projectId}
          members={members}
          allProfiles={allProfiles}
          isAdmin={isAdmin}
        />
      ) : (
        <NoProjectsEmptyState isAdmin={isAdmin} />
      )}
    </div>
  );
}
