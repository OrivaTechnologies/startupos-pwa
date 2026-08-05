import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getCurrentProfile, getVisibleTaskProjects, getBacklogTasks } from "@/lib/queries";
import { resolveProjectId } from "@/lib/task-projects";
import { UserAvatarLink } from "@/components/user-avatar-link";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { NoProjectsEmptyState } from "@/components/tasks/no-projects-empty-state";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const supabase = await createClient();
  const access = await requireTool(supabase, "tasks");
  const [profile, projects] = await Promise.all([
    getCurrentProfile(supabase),
    getVisibleTaskProjects(supabase),
  ]);
  const fullName = profile?.full_name || profile?.email || "Account";

  const projectId = resolveProjectId(projects, project);
  const currentProject = projects.find((p) => p.id === projectId);
  const projectName = currentProject?.name ?? "";
  const projectKeyPrefix = currentProject?.keyPrefix ?? "TASK";
  const tasks = projectId ? await getBacklogTasks(supabase, projectId) : [];

  return (
    <div className="tasks-theme mx-auto flex min-h-svh w-full max-w-md flex-col pb-24 md:max-w-none md:pb-6">
      {/* Mobile only — desktop/tablet keeps profile in the sidebar. */}
      <div className="flex items-start justify-end px-4 pt-6 pb-4 md:hidden">
        <UserAvatarLink
          name={fullName}
          avatarUrl={profile?.avatar_url}
          currentModule="tasks"
          canSwitch={access.tools.length > 1}
        />
      </div>

      {projectId ? (
        <TasksBoard
          tasks={tasks}
          projects={projects}
          projectId={projectId}
          projectName={projectName}
          projectKeyPrefix={projectKeyPrefix}
          currentUserId={profile?.id}
          currentUserRole={profile?.role}
        />
      ) : (
        <div className="px-4">
          <NoProjectsEmptyState isAdmin={profile?.role === "admin"} />
        </div>
      )}
    </div>
  );
}
