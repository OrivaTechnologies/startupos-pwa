import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getCurrentProfile, getTaskMembers, getTasksForTab, type TasksTab } from "@/lib/queries";
import { TasksView } from "@/components/tasks/tasks-view";
import { TaskListSkeleton } from "@/components/tasks/task-list-skeleton";

const VALID_TABS: TasksTab[] = ["all", "mine", "archived"];

function parseTab(value?: string): TasksTab {
  if (value && VALID_TABS.includes(value as TasksTab)) return value as TasksTab;
  return "all";
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = parseTab(tabParam);
  const supabase = await createClient();
  const profilePromise = getCurrentProfile(supabase);
  const membersPromise = getTaskMembers(supabase);
  const tasksPromise =
    tab === "mine"
      ? profilePromise.then((profile) =>
          profile ? getTasksForTab(supabase, tab, profile.id) : []
        )
      : getTasksForTab(supabase, tab, "");

  const [access, profile, members, tasks] = await Promise.all([
    requireTool(supabase, "tasks"),
    profilePromise,
    membersPromise,
    tasksPromise,
  ]);
  const fullName = profile?.full_name || profile?.email || "Account";

  const assigneeOptions: [string, string][] = members.map((m) => [m.id, m.name]);

  return (
    <div className="tasks-theme mx-auto flex min-h-svh w-full max-w-md flex-col pb-24 md:max-w-none md:pb-6 md:pt-2">
      <Suspense fallback={<div className="px-4"><TaskListSkeleton /></div>}>
        <TasksView
          tasks={tasks}
          tab={tab}
          currentUserId={profile?.id}
          currentUserRole={profile?.role}
          profileName={fullName}
          profileAvatarUrl={profile?.avatar_url}
          canSwitchWorkspace={access.tools.length > 1}
          assigneeOptions={assigneeOptions}
        />
      </Suspense>
    </div>
  );
}
