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
  Plus,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandMark } from "@/components/brand-mark";
import { CreateListSheet } from "@/components/tasks/create-list-sheet";
import { ListActions } from "@/components/tasks/list-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceId } from "@/components/active-workspace";
import type { TaskListSummary } from "@/lib/tasks";
import type { UserRole } from "@/lib/supabase/types";

const LEDGER_TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Landmark },
] as const;

const WORKSPACES: Record<WorkspaceId, { label: string; href: string; icon: typeof Landmark }> = {
  ledger: { label: "Ledger", href: "/home", icon: Landmark },
  tasks: { label: "Tasks", href: "/tasks", icon: ListChecks },
};

const WORKSPACE_IDS = Object.keys(WORKSPACES) as WorkspaceId[];

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
  taskLists,
  currentUserRole,
  name,
  avatarUrl,
}: {
  activeWorkspace: WorkspaceId;
  canSwitchWorkspace: boolean;
  taskLists: TaskListSummary[];
  currentUserRole?: UserRole;
  name: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [createListOpen, setCreateListOpen] = useState(false);
  const currentListId = searchParams.get("list") ?? taskLists[0]?.id;
  const CurrentWorkspaceIcon = WORKSPACES[activeWorkspace].icon;
  // Mirrors TasksBoard's rule: only admins can delete a real list (rename
  // isn't offered here — "My Tasks" isn't deletable at all, it's virtual).
  const canDeleteList = currentUserRole === "admin";

  function switchTo(id: WorkspaceId) {
    if (id === activeWorkspace) return;
    document.cookie = `active_workspace=${id}; path=/; max-age=31536000; samesite=lax`;
    router.push(WORKSPACES[id].href);
    // The (app) layout reads this cookie to decide what the sidebar shows,
    // but Next.js reuses cached layout output across client navigations —
    // refresh() forces it to re-render with the new cookie value.
    router.refresh();
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
            {taskLists.map((list) => (
              <div key={list.id} className="flex items-center gap-1">
                <SidebarLink
                  href={`/tasks?list=${list.id}`}
                  icon={ListChecks}
                  active={list.id === currentListId}
                  className="flex-1"
                >
                  {list.name}
                </SidebarLink>
                {/* Everything but the virtual "My Tasks" list can be deleted from here. */}
                {!list.isVirtual ? (
                  <ListActions
                    list={{ id: list.id, name: list.name }}
                    canRename={false}
                    canDelete={canDeleteList}
                    onRenamed={() => {}}
                    onDeleted={() => {}}
                    triggerClassName="size-8 shrink-0"
                  />
                ) : null}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setCreateListOpen(true)}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <Plus className="size-4" />
              New list
            </button>

            <CreateListSheet
              open={createListOpen}
              onOpenChange={setCreateListOpen}
              onCreated={(list) => {
                router.push(`/tasks?list=${list.id}`);
                router.refresh();
              }}
            />
          </>
        )}
      </nav>

      {/* Bottom-anchored: workspace switcher stacked directly above profile.
          WORKSPACES is a record, so adding a third/fourth workspace later
          just means adding an entry — the dropdown grows with it. */}
      <div className="mt-4 flex shrink-0 flex-col gap-1 border-t border-glass-border pt-4">
        {canSwitchWorkspace ? (
          <>
            <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Active workspace
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground"
                >
                  <CurrentWorkspaceIcon className="size-4" />
                  <span className="flex-1 truncate">{WORKSPACES[activeWorkspace].label}</span>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {WORKSPACE_IDS.map((id) => {
                  const workspace = WORKSPACES[id];
                  const Icon = workspace.icon;
                  return (
                    <DropdownMenuItem key={id} onSelect={() => switchTo(id)}>
                      <Icon className="size-4" />
                      {workspace.label}
                      {id === activeWorkspace ? <Check className="ml-auto size-3.5" /> : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
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
