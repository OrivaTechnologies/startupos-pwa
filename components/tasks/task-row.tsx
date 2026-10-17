"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, MoreVertical, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { cn } from "@/lib/utils";
import { canMutateRecord } from "@/lib/permissions";
import { setTaskStatus, deleteTask, setTaskArchived } from "@/app/(app)/tasks/actions";
import { TASK_STATUS_ORDER, TASK_STATUS_LABEL } from "@/lib/task-status";
import { toIST } from "@/lib/datetime";
import type { UserRole, TaskStatus } from "@/lib/supabase/types";
import type { TaskListItem } from "@/lib/queries";

function assigneeInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

function TaskMeta({ task }: { task: TaskListItem }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
          task.status === "done"
            ? "bg-primary/15 text-primary"
            : task.status === "in_progress"
              ? "bg-amber-500/15 text-amber-500"
              : "bg-secondary text-secondary-foreground"
        )}
      >
        {TASK_STATUS_LABEL[task.status]}
      </span>
      {task.due_at ? (
        <span className="flex items-center gap-1">
          <Calendar className="size-3.5" />
          {format(toIST(task.due_at), "d MMM yyyy")}
        </span>
      ) : null}
      {task.assigneeName ? (
        <span className="flex items-center gap-1.5">
          <Avatar className="size-5">
            {task.assigneeAvatarUrl ? (
              <AvatarImage src={task.assigneeAvatarUrl} alt={task.assigneeName} />
            ) : null}
            <AvatarFallback className="bg-secondary text-[9px] text-secondary-foreground">
              {assigneeInitials(task.assigneeName)}
            </AvatarFallback>
          </Avatar>
          {task.assigneeName}
        </span>
      ) : null}
    </div>
  );
}

export function TaskRow({
  task,
  archivedView = false,
  currentUserId,
  currentUserRole,
}: {
  task: TaskListItem;
  archivedView?: boolean;
  currentUserId?: string;
  currentUserRole?: UserRole;
}) {
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canMutate =
    canMutateRecord(currentUserRole, currentUserId, task.user_id) ||
    canMutateRecord(currentUserRole, currentUserId, task.assignee_id);

  function changeStatus(status: TaskStatus) {
    if (status === task.status || archivedView) return;
    startTransition(async () => {
      const result = await setTaskStatus(task.id, status);
      if (result.error) toast.error(result.error);
    });
  }

  function toggleArchive() {
    startTransition(async () => {
      const result = await setTaskArchived(task.id, !archivedView);
      if (result.error) toast.error(result.error);
    });
  }

  async function handleDelete() {
    const result = await deleteTask(task.id);
    if (result?.error) return { error: result.error };
    return {};
  }

  const titleClass = cn(
    "min-w-0 text-sm leading-5",
    task.status === "done" && !archivedView && "text-muted-foreground line-through md:no-underline"
  );

  return (
    <div className="relative rounded-2xl border border-glass-border bg-glass px-5 py-4.5 shadow-lg shadow-black/20 backdrop-blur-xl backdrop-saturate-150 md:flex md:items-start md:gap-3.5 dark:bg-card/50">
      <Link href={`/tasks/detail/${task.id}`} className="block md:hidden">
        <span
          className={cn(
            "flex h-8 items-center text-xs font-medium text-muted-foreground",
            canMutate && "pr-8"
          )}
        >
          TASK-{task.number}
        </span>
        <p className={cn(titleClass, "mt-1 line-clamp-2")}>{task.title}</p>
        <TaskMeta task={task} />
      </Link>

      <Link href={`/tasks/detail/${task.id}`} className="hidden min-w-0 flex-1 md:block">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">TASK-{task.number}</span>
          <p className={cn(titleClass, "truncate")}>{task.title}</p>
        </div>
        <TaskMeta task={task} />
      </Link>

      {canMutate ? (
        <div className="absolute top-4.5 right-5 z-10 md:static">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Task options"
                disabled={isPending}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                <MoreVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!archivedView ? (
                <>
                  <DropdownMenuLabel>Change status</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={task.status}
                    onValueChange={(value) => changeStatus(value as TaskStatus)}
                  >
                    {TASK_STATUS_ORDER.map((status) => (
                      <DropdownMenuRadioItem key={status} value={status}>
                        {TASK_STATUS_LABEL[status]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={toggleArchive}>
                    <Archive className="size-4" />
                    Archive
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onSelect={toggleArchive}>
                  <ArchiveRestore className="size-4" />
                  Unarchive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this task?"
        description={`"${task.title}" will be permanently removed. This can't be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
