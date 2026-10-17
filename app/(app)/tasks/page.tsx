import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getCurrentProfile, getTaskMembers, getTasksForTab, type TasksTab } from "@/lib/queries";
import { TasksView } from "@/components/tasks/tasks-view";

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
  const access = await requireTool(supabase, "tasks");
  const profile = await getCurrentProfile(supabase);
  const fullName = profile?.full_name || profile?.email || "Account";

  const [tasks, members] = profile
    ? await Promise.all([
        getTasksForTab(supabase, tab, profile.id),
        getTaskMembers(supabase),
      ])
    : [[], []];

  const assigneeOptions: [string, string][] = members.map((m) => [m.id, m.name]);

  return (
    <div className="tasks-theme mx-auto flex min-h-svh w-full max-w-md flex-col pb-24 md:max-w-none md:pb-6 md:pt-2">
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
    </div>
  );
}
