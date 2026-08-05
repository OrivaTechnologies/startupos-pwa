import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getCurrentProfile, getVisibleTaskProjects, getActiveSprintBoardTasks } from "@/lib/queries";
import { resolveProjectId } from "@/lib/task-projects";
import { BoardColumns } from "@/components/tasks/board-columns";
import { NoProjectsEmptyState } from "@/components/tasks/no-projects-empty-state";

export default async function TaskBoardPage({
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
  const currentProject = projects.find((p) => p.id === projectId);
  const projectName = currentProject?.name;

  const { sprint, tasks } = projectId
    ? await getActiveSprintBoardTasks(supabase, projectId)
    : { sprint: null, tasks: [] };

  return (
    <div className="tasks-theme mx-auto flex w-full max-w-none flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-3 pb-4">
        <h1 className="text-xl font-semibold">
          {sprint ? `${projectName} · Sprint ${sprint.number} board` : projectName ? `${projectName} · Board` : "Board"}
        </h1>
        {sprint ? (
          <Link
            href={`/tasks/new?project=${projectId}&sprint=${sprint.id}`}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95"
          >
            <Plus className="size-4" />
            Add task
          </Link>
        ) : null}
      </div>

      {!projectId ? (
        <NoProjectsEmptyState isAdmin={isAdmin} />
      ) : sprint ? (
        <BoardColumns
          tasks={tasks}
          keyPrefix={currentProject?.keyPrefix ?? "TASK"}
          currentUserId={profile?.id}
          currentUserRole={profile?.role}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-glass-border bg-glass px-6 py-12 text-center shadow-lg shadow-black/20 backdrop-blur-xl dark:bg-card/50">
          <p className="text-sm text-muted-foreground">No active sprint right now.</p>
          <Link
            href={`/sprints?project=${projectId}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Go to Sprints
          </Link>
        </div>
      )}
    </div>
  );
}
