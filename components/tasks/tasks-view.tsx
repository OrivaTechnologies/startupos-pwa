"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import type { TaskListItem, TasksTab } from "@/lib/queries";
import type { UserRole } from "@/lib/supabase/types";
import { UserAvatarLink } from "@/components/user-avatar-link";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskListSkeleton } from "@/components/tasks/task-list-skeleton";
import { TaskFilters, ALL_FILTER } from "@/components/tasks/task-filters";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";

const PAGE_SIZE = 20;

const TABS: { id: TasksTab; label: string }[] = [
  { id: "all", label: "All Tasks" },
  { id: "mine", label: "My Tasks" },
  { id: "archived", label: "Archived" },
];

function parseClientTab(value: string | null): TasksTab {
  if (value === "mine" || value === "archived") return value;
  return "all";
}

export function TasksView({
  tasks,
  tab,
  currentUserId,
  currentUserRole,
  profileName,
  profileAvatarUrl,
  canSwitchWorkspace,
  assigneeOptions,
}: {
  tasks: TaskListItem[];
  tab: TasksTab;
  currentUserId?: string;
  currentUserRole?: UserRole;
  profileName?: string;
  profileAvatarUrl?: string | null;
  canSwitchWorkspace?: boolean;
  assigneeOptions: [string, string][];
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // The URL updates as soon as a tab is clicked. `tab` is the list the server
  // has actually returned, so a mismatch means that response is still in flight.
  const requestedTab = parseClientTab(useSearchParams().get("tab"));
  const listPending = requestedTab !== tab;
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [assigneeFilter, setAssigneeFilter] = useState(ALL_FILTER);

  const [prevTab, setPrevTab] = useState(tab);
  const [prevStatusFilter, setPrevStatusFilter] = useState(statusFilter);
  const [prevAssigneeFilter, setPrevAssigneeFilter] = useState(assigneeFilter);
  if (tab !== prevTab) {
    setPrevTab(tab);
    setStatusFilter(ALL_FILTER);
    setAssigneeFilter(ALL_FILTER);
    setPrevStatusFilter(ALL_FILTER);
    setPrevAssigneeFilter(ALL_FILTER);
    setPage(0);
  } else if (statusFilter !== prevStatusFilter || assigneeFilter !== prevAssigneeFilter) {
    setPrevStatusFilter(statusFilter);
    setPrevAssigneeFilter(assigneeFilter);
    setPage(0);
  }

  const showAssigneeFilter = requestedTab === "all";

  const filteredTasks = tasks
    .filter((t) => statusFilter === ALL_FILTER || t.status === statusFilter)
    .filter(
      (t) =>
        !showAssigneeFilter ||
        assigneeFilter === ALL_FILTER ||
        t.assignee_id === assigneeFilter
    );

  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const currentPage = isDesktop ? Math.min(page, pageCount - 1) : 0;
  const visibleTasks = isDesktop
    ? filteredTasks.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
    : filteredTasks;

  const emptyTitle =
    tab === "archived"
      ? "No archived tasks"
      : tab === "mine"
        ? "Nothing assigned to you yet"
        : "No tasks yet";
  const emptyHint =
    tab === "archived"
      ? "Tasks you archive will show up here."
      : tab === "mine"
        ? "Create a task or ask a teammate to assign one to you."
        : "Add the first task for the team.";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-3 md:pt-4 md:pb-4">
        <h1 className="min-w-0 flex-1 text-lg font-semibold leading-none">
          <span className="md:hidden">Tasks</span>
          <span className="hidden md:inline">
            {TABS.find((t) => t.id === requestedTab)?.label ?? "Tasks"}
          </span>
        </h1>

        <div className="flex shrink-0 items-center gap-2">
          {requestedTab !== "archived" ? (
            <Link
              href="/tasks/new"
              className="hidden items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95 md:flex"
            >
              <Plus className="size-4 shrink-0" />
              Add task
            </Link>
          ) : null}
          {profileName ? (
            <div className="md:hidden">
              <UserAvatarLink
                name={profileName}
                avatarUrl={profileAvatarUrl}
                currentModule="tasks"
                canSwitch={canSwitchWorkspace ?? false}
              />
            </div>
          ) : null}
        </div>
      </div>

      <nav
        aria-label="Task lists"
        className="mx-4 mb-3 grid grid-cols-3 gap-1 rounded-xl bg-secondary/40 p-1 md:hidden"
      >
        {TABS.map((item) => {
          const active = item.id === requestedTab;
          return (
            <Link
              key={item.id}
              href={item.id === "all" ? "/tasks" : `/tasks?tab=${item.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "truncate rounded-lg px-2 py-2 text-center text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm dark:bg-card"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {requestedTab !== "archived" ? (
        <TaskFilters
          className="mx-4 mb-3 rounded-xl bg-secondary/40 px-3 py-2.5"
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          assigneeValue={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          assigneeOptions={assigneeOptions}
          showAssigneeFilter={showAssigneeFilter}
        />
      ) : null}

      <div className="flex flex-col gap-3.5 px-4">
        {listPending ? (
          <TaskListSkeleton />
        ) : visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              archivedView={tab === "archived"}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          ))
        ) : tasks.length > 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-glass-border bg-glass px-6 py-10 text-center shadow-lg shadow-black/20 backdrop-blur-xl dark:bg-card/50">
            <p className="text-sm text-muted-foreground">No tasks match these filters.</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-glass-border bg-glass px-6 py-12 text-center shadow-lg shadow-black/20 backdrop-blur-xl dark:bg-card/50">
            {tab !== "archived" ? (
              <Link
                href="/tasks/new"
                aria-label="Add task"
                className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform hover:bg-primary/25 active:scale-95"
              >
                <Plus className="size-7" />
              </Link>
            ) : null}
            <div>
              <p className="text-base font-medium">{emptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{emptyHint}</p>
            </div>
          </div>
        )}

        {isDesktop && pageCount > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-1 pt-3">
            <p className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage >= pageCount - 1}
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {requestedTab !== "archived" ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 md:hidden">
          <div className="mx-auto flex w-full max-w-md justify-end px-4">
            <Link
              href="/tasks/new"
              aria-label="Add task"
              className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
            >
              <Plus className="size-6" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
