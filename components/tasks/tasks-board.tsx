"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { canMutateRecord } from "@/lib/permissions";
import type { TaskListWithTasks } from "@/lib/queries";
import type { TaskStatus, UserRole } from "@/lib/supabase/types";
import { TASK_STATUS_ORDER, TASK_STATUS_LABEL } from "@/lib/task-status";
import { TaskRow } from "@/components/tasks/task-row";
import { CreateListSheet } from "@/components/tasks/create-list-sheet";
import { ListActions } from "@/components/tasks/list-actions";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/lib/use-media-query";

const PAGE_SIZE = 20;

export function TasksBoard({
  lists,
  selectedListId: urlSelectedListId,
  currentUserId,
  currentUserRole,
}: {
  lists: TaskListWithTasks[];
  selectedListId?: string;
  currentUserId?: string;
  currentUserRole?: UserRole;
}) {
  const [allLists, setAllLists] = useState(lists);
  const [selectedListId, setSelectedListId] = useState(urlSelectedListId ?? lists[0]?.id ?? "");
  const [createListOpen, setCreateListOpen] = useState(false);
  // Desktop has room for pagination controls and status tabs; mobile keeps
  // the single continuous list (same tradeoff as the transactions list).
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<TaskStatus>("todo");

  // Keep local state in sync with fresh server data (e.g. a newly created
  // task, or the sidebar navigating to a different ?list=) without an
  // effect-based render waterfall.
  const [prevLists, setPrevLists] = useState(lists);
  if (lists !== prevLists) {
    setPrevLists(lists);
    setAllLists(lists);
  }
  const [prevUrlSelectedListId, setPrevUrlSelectedListId] = useState(urlSelectedListId);
  if (urlSelectedListId !== prevUrlSelectedListId) {
    setPrevUrlSelectedListId(urlSelectedListId);
    if (urlSelectedListId) setSelectedListId(urlSelectedListId);
  }
  // Reset to page 1 whenever the selected list or status tab changes.
  const [prevSelectedListId, setPrevSelectedListId] = useState(selectedListId);
  const [prevStatusFilter, setPrevStatusFilter] = useState(statusFilter);
  if (selectedListId !== prevSelectedListId || statusFilter !== prevStatusFilter) {
    setPrevSelectedListId(selectedListId);
    setPrevStatusFilter(statusFilter);
    setPage(0);
  }

  const selectedList = allLists.find((l) => l.id === selectedListId) ?? allLists[0];
  const tasks = selectedList?.tasks ?? [];
  // Status tabs are a desktop-only view — mobile keeps the mixed, single
  // continuous list unchanged.
  const filteredTasks = isDesktop ? tasks.filter((t) => t.status === statusFilter) : tasks;
  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const currentPage = isDesktop ? Math.min(page, pageCount - 1) : 0;
  const visibleTasks = isDesktop
    ? filteredTasks.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
    : filteredTasks;

  function handleListRenamed(id: string, name: string) {
    setAllLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
  }

  function handleListDeleted(id: string) {
    setAllLists((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (selectedListId === id) setSelectedListId(next[0]?.id ?? "");
      return next;
    });
  }

  const canRenameSelected =
    !!selectedList &&
    !selectedList.isVirtual &&
    canMutateRecord(currentUserRole, currentUserId, selectedList.user_id);
  const canDeleteSelected =
    !!selectedList && !selectedList.isVirtual && currentUserRole === "admin";

  return (
    <div className="flex flex-1 flex-col">
      {/* Mobile only — desktop/tablet switches lists from the sidebar. */}
      <div className="flex items-center gap-4 overflow-x-auto px-4 pb-3 md:hidden">
        {allLists.map((list) => {
          const isSelected = list.id === selectedList?.id;
          return (
            <div key={list.id} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedListId(list.id)}
                className={cn(
                  "border-b-2 px-0.5 pb-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isSelected
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                )}
              >
                {list.name}
              </button>
              {isSelected && !list.isVirtual ? (
                <ListActions
                  list={{ id: list.id, name: list.name }}
                  canRename={canRenameSelected}
                  canDelete={canDeleteSelected}
                  onRenamed={handleListRenamed}
                  onDeleted={handleListDeleted}
                  triggerClassName="size-auto rounded-none border-b-2 border-transparent px-0 pb-2 text-primary hover:bg-transparent"
                />
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setCreateListOpen(true)}
          className="flex shrink-0 items-center gap-1 border-b-2 border-transparent px-0.5 pb-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-4" />
          New list
        </button>
      </div>

      {/* Desktop/tablet only — the sidebar owns list switching, so this row
          is just the selected list's name and the primary add action. */}
      <div className="hidden items-center justify-between px-4 pb-4 md:flex">
        <h2 className="text-base font-semibold">{selectedList?.name ?? "Tasks"}</h2>
        {selectedList ? (
          <Link
            href={`/tasks/new?list=${selectedList.id}`}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95"
          >
            <Plus className="size-4" />
            Add task
          </Link>
        ) : null}
      </div>

      {/* Desktop only — split the selected list's tasks by status. */}
      <div className="hidden items-center gap-2 px-4 pb-3 md:flex">
        {TASK_STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === s
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground"
            )}
          >
            {TASK_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 px-4 pt-2">
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          ))
        ) : tasks.length > 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-glass-border bg-glass px-6 py-10 text-center shadow-lg shadow-black/20 backdrop-blur-xl dark:bg-card/50">
            <p className="text-sm text-muted-foreground">
              No {TASK_STATUS_LABEL[statusFilter].toLowerCase()} tasks in this list.
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-glass-border bg-glass px-6 py-12 text-center shadow-lg shadow-black/20 backdrop-blur-xl dark:bg-card/50">
            <Link
              href={selectedList ? `/tasks/new?list=${selectedList.id}` : "/tasks/new"}
              aria-label="Add task"
              className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform hover:bg-primary/25 active:scale-95"
            >
              <Plus className="size-7" />
            </Link>
            <div>
              <p className="text-base font-medium">No tasks yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedList
                  ? `Add your first task to ${selectedList.name}.`
                  : "Add your first task."}
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

      {selectedList ? (
        <Link
          href={`/tasks/new?list=${selectedList.id}`}
          aria-label="Add task"
          className="fixed right-4 bottom-6 z-40 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 md:hidden"
        >
          <Plus className="size-6" />
        </Link>
      ) : null}

      <CreateListSheet
        open={createListOpen}
        onOpenChange={setCreateListOpen}
        onCreated={(list) => {
          setAllLists((prev) => [
            ...prev,
            { ...list, isVirtual: false, user_id: currentUserId ?? "", tasks: [] },
          ]);
          setSelectedListId(list.id);
        }}
      />
    </div>
  );
}
