"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Home,
  ArrowLeftRight,
  BarChart3,
  Landmark,
  ListChecks,
  CalendarRange,
  Kanban,
  Users,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandMark } from "@/components/brand-mark";
import { ProjectFormDialog } from "@/components/tasks/project-form-dialog";
import { SwitcherRow } from "@/components/switcher";
import { WORKSPACE_OPTIONS, switchWorkspace } from "@/lib/workspace-options";
import { getProjectBlockers } from "@/app/(app)/tasks/projects/actions";
import type { WorkspaceId } from "@/lib/tools";
import type { ProjectSummary } from "@/lib/task-projects";
import type { UserRole } from "@/lib/supabase/types";

const LEDGER_TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Landmark },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function AppSidebar({
  activeWorkspace,
  canSwitchWorkspace,
  taskProjects,
  currentUserRole,
  name,
  avatarUrl,
}: {
  activeWorkspace: WorkspaceId;
  canSwitchWorkspace: boolean;
  taskProjects: ProjectSummary[];
  currentUserRole?: UserRole;
  name: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editBlockers, setEditBlockers] = useState<{ sprintCount: number; taskCount: number }>();
  const currentProjectId = searchParams.get("project") ?? taskProjects[0]?.id;
  const currentProject = taskProjects.find((p) => p.id === currentProjectId);
  const currentWorkspaceOption = WORKSPACE_OPTIONS.find((w) => w.id === activeWorkspace)!;

  function switchProject(id: string) {
    router.push(`${pathname}?project=${id}`);
  }

  async function openEditProject() {
    if (!currentProject) return;
    setEditBlockers(await getProjectBlockers(currentProject.id));
    setEditProjectOpen(true);
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-glass-border bg-glass px-4 py-6 md:sticky md:top-0 md:flex md:h-svh dark:bg-card/30">
      <div className="flex shrink-0 items-center gap-2 px-2 pb-6">
        <BrandMark size={28} />
        <span className="text-lg font-semibold">StartupOS</span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {activeWorkspace === "ledger" ? (
          <>
            {LEDGER_TABS.map((tab) => (
              <SidebarLink key={tab.href} href={tab.href} icon={tab.icon} active={pathname.startsWith(tab.href)}>
                {tab.label}
              </SidebarLink>
            ))}

            <Link
              href="/transactions/new"
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95"
            >
              <Plus className="size-4" />
              Add transaction
            </Link>
          </>
        ) : (
          <>
            <SwitcherRow
              label="Project"
              variant="compact"
              emptyLabel="No project"
              current={
                currentProject
                  ? { id: currentProject.id, label: currentProject.name, avatarUrl: currentProject.avatarUrl }
                  : undefined
              }
              options={taskProjects.map((p) => ({ id: p.id, label: p.name, avatarUrl: p.avatarUrl }))}
              onSelect={switchProject}
              onEdit={currentUserRole === "admin" ? openEditProject : undefined}
              extraAction={
                currentUserRole === "admin"
                  ? { label: "New project", onClick: () => setCreateProjectOpen(true) }
                  : undefined
              }
            />

            {currentProjectId ? (
              <>
                <SidebarLink
                  href={`/tasks?project=${currentProjectId}`}
                  icon={ListChecks}
                  active={pathname === "/tasks"}
                >
                  Backlog
                </SidebarLink>
                <SidebarLink
                  href={`/tasks/board?project=${currentProjectId}`}
                  icon={Kanban}
                  active={pathname.startsWith("/tasks/board")}
                >
                  Active Sprint
                </SidebarLink>
                <SidebarLink
                  href={`/sprints?project=${currentProjectId}`}
                  icon={CalendarRange}
                  active={pathname.startsWith("/sprints")}
                >
                  Sprints
                </SidebarLink>
                <SidebarLink
                  href={`/tasks/members?project=${currentProjectId}`}
                  icon={Users}
                  active={pathname.startsWith("/tasks/members")}
                >
                  Members
                </SidebarLink>
              </>
            ) : null}

            <ProjectFormDialog
              mode="create"
              open={createProjectOpen}
              onOpenChange={setCreateProjectOpen}
              onSaved={(project) => {
                router.push(`/tasks?project=${project.id}`);
                router.refresh();
              }}
            />

            {currentProject ? (
              <ProjectFormDialog
                mode="edit"
                project={currentProject}
                blockers={editBlockers}
                open={editProjectOpen}
                onOpenChange={setEditProjectOpen}
                onSaved={() => router.refresh()}
                onDeleted={() => {
                  router.push("/tasks");
                  router.refresh();
                }}
              />
            ) : null}
          </>
        )}
      </nav>

      {/* Bottom-anchored: workspace switcher stacked directly above profile. */}
      <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-glass-border pt-4">
        {canSwitchWorkspace ? (
          <SwitcherRow
            label="Active workspace"
            variant="compact"
            current={{
              id: currentWorkspaceOption.id,
              label: currentWorkspaceOption.label,
              icon: currentWorkspaceOption.icon,
            }}
            options={WORKSPACE_OPTIONS}
            onSelect={(id) => switchWorkspace(id as WorkspaceId, router)}
            confirm={{
              title: (option) => `Switch to ${option.label}?`,
              description: () => "You'll leave what you're doing here and switch context.",
            }}
          />
        ) : null}

        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/profile") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Avatar className="size-8 border border-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{name}</span>
        </Link>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  active,
  className,
  children,
}: {
  href: string;
  icon: typeof Home;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        className
      )}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}
