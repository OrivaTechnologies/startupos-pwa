"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BacklogTask } from "@/lib/queries";
import type { UserRole } from "@/lib/supabase/types";
import type { ProjectSummary } from "@/lib/task-projects";
import { TaskRow } from "@/components/tasks/task-row";
import { ProjectFormDialog } from "@/components/tasks/project-form-dialog";
import { TaskFilters, ALL_FILTER } from "@/components/tasks/task-filters";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/lib/use-media-query";

const PAGE_SIZE = 20;

export function TasksBoard({
  tasks,
  projects,
  projectId,
  projectName,
  projectKeyPrefix,
  currentUserId,
  currentUserRole,
}: {
  tasks: BacklogTask[];
  projects: ProjectSummary[];
  projectId: string;
  projectName: string;
  projectKeyPrefix: string;
  currentUserId?: string;
  currentUserRole?: UserRole;
}) {
  const router = useRouter();
  // Desktop has room for pagination controls; mobile keeps the single
  // continuous list (same tradeoff as the transactions list).
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [assigneeFilter, setAssigneeFilter] = useState(ALL_FILTER);
  const [priorityFilter, setPriorityFilter] = useState(ALL_FILTER);
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  // Reset to page 1 whenever a filter changes.
  const [prevStatusFilter, setPrevStatusFilter] = useState(statusFilter);
  const [prevAssigneeFilter, setPrevAssigneeFilter] = useState(assigneeFilter);
  const [prevPriorityFilter, setPrevPriorityFilter] = useState(priorityFilter);
  const [prevTypeFilter, setPrevTypeFilter] = useState(typeFilter);
  if (
    statusFilter !== prevStatusFilter ||
    assigneeFilter !== prevAssigneeFilter ||
    priorityFilter !== prevPriorityFilter ||
    typeFilter !== prevTypeFilter
  ) {
    setPrevStatusFilter(statusFilter);
    setPrevAssigneeFilter(assigneeFilter);
    setPrevPriorityFilter(priorityFilter);
    setPrevTypeFilter(typeFilter);
    setPage(0);
  }

  const assigneeOptions = Array.from(
    new Map(
      tasks
        .filter((t) => t.assignee_id && t.assigneeName)
        .map((t) => [t.assignee_id as string, t.assigneeName as string])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  // All four filters apply uniformly on mobile and desktop.
  const filteredTasks = tasks
    .filter((t) => statusFilter === ALL_FILTER || t.status === statusFilter)
    .filter((t) => assigneeFilter === ALL_FILTER || t.assignee_id === assigneeFilter)
    .filter((t) => priorityFilter === ALL_FILTER || t.priority === priorityFilter)
    .filter((t) => typeFilter === ALL_FILTER || t.task_type === typeFilter);
  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const currentPage = isDesktop ? Math.min(page, pageCount - 1) : 0;
  const visibleTasks = isDesktop
    ? filteredTasks.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
    : filteredTasks;

  return (
    <div className="flex flex-1 flex-col">
      {/* Mobile only — desktop/tablet switches projects from the sidebar. */}
      <div className="flex items-center gap-4 overflow-x-auto px-4 pb-3 md:hidden">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/tasks?project=${project.id}`}
            className={cn(
              "border-b-2 px-0.5 pb-2 text-sm font-medium whitespace-nowrap transition-colors",
              project.id === projectId
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            )}
          >
            {project.name}
          </Link>
        ))}
        {currentUserRole === "admin" ? (
          <button
            type="button"
            onClick={() => setCreateProjectOpen(true)}
            className="flex shrink-0 items-center gap-1 border-b-2 border-transparent px-0.5 pb-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="size-4" />
            New project
          </button>
        ) : null}
      </div>

      {/* Desktop/tablet only — the sidebar owns project switching, so this
          row is just the project name and the primary add action. */}
      <div className="hidden items-center justify-between px-4 pb-4 md:flex">
        <h2 className="text-base font-semibold">{projectName} · Backlog</h2>
        <Link
          href={`/tasks/new?project=${projectId}`}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95"
        >
          <Plus className="size-4" />
          Add task
        </Link>
      </div>

      {/* Filters — one uniform row of dropdowns, same on mobile and desktop. */}
      <TaskFilters
        className="mx-4 mb-3 rounded-xl bg-secondary/40 px-3 py-2.5"
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        assigneeValue={assigneeFilter}
        onAssigneeChange={setAssigneeFilter}
        assigneeOptions={assigneeOptions}
        priorityValue={priorityFilter}
        onPriorityChange={setPriorityFilter}
        typeValue={typeFilter}
        onTypeChange={setTypeFilter}
      />

      <div className="flex flex-col gap-3.5 px-4 pt-2">
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              keyPrefix={projectKeyPrefix}
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
            <Link
              href={`/tasks/new?project=${projectId}`}
              aria-label="Add task"
              className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform hover:bg-primary/25 active:scale-95"
            >
              <Plus className="size-7" />
            </Link>
            <div>
              <p className="text-base font-medium">No tasks yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first task to {projectName}&apos;s backlog.
              </p>
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

      <Link
        href={`/tasks/new?project=${projectId}`}
        aria-label="Add task"
        className="fixed right-4 bottom-6 z-40 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 md:hidden"
      >
        <Plus className="size-6" />
      </Link>

      <ProjectFormDialog
        mode="create"
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSaved={(project) => {
          router.push(`/tasks?project=${project.id}`);
          router.refresh();
        }}
      />
    </div>
  );
}
