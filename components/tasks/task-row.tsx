"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, CalendarClock, Loader2, MoreVertical, Trash2 } from "lucide-react";
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
import { setTaskStatus, deleteTask } from "@/app/(app)/tasks/actions";
import { nextTaskStatus, TASK_STATUS_ORDER, TASK_STATUS_LABEL } from "@/lib/task-status";
import type { UserRole, TaskStatus } from "@/lib/supabase/types";

export interface TaskRowData {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: TaskStatus;
  user_id: string;
  assignee_id: string | null;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
}

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

export function TaskRow({
  task,
  currentUserId,
  currentUserRole,
}: {
  task: TaskRowData;
  currentUserId?: string;
  currentUserRole?: UserRole;
}) {
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canMutate =
    canMutateRecord(currentUserRole, currentUserId, task.user_id) ||
    canMutateRecord(currentUserRole, currentUserId, task.assignee_id);

  function advanceStatus() {
    startTransition(async () => {
      const result = await setTaskStatus(task.id, nextTaskStatus(task.status));
      if (result.error) toast.error(result.error);
    });
  }

  function changeStatus(status: TaskStatus) {
    if (status === task.status) return;
    startTransition(async () => {
      const result = await setTaskStatus(task.id, status);
      if (result.error) toast.error(result.error);
    });
  }

  async function handleDelete() {
    const result = await deleteTask(task.id);
    if (result?.error) return { error: result.error };
    return {};
  }

  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-glass-border bg-glass px-5 py-4.5 shadow-lg shadow-black/20 backdrop-blur-xl backdrop-saturate-150 dark:bg-card/50">
      {/* Mobile: tap the circle to cycle status. Desktop: the "…" menu below. */}
      <button
        type="button"
        onClick={advanceStatus}
        disabled={isPending || !canMutate}
        aria-label={`${TASK_STATUS_LABEL[task.status]} — tap to mark as ${TASK_STATUS_LABEL[nextTaskStatus(task.status)]}`}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50 md:hidden",
          task.status === "done"
            ? "border-primary bg-primary"
            : task.status === "in_progress"
              ? "border-amber-500 bg-amber-500/20"
              : "border-muted-foreground"
        )}
      >
        {isPending ? (
          <Loader2
            className={cn(
              "size-3 animate-spin",
              task.status === "done" ? "text-primary-foreground" : "text-muted-foreground"
            )}
          />
        ) : task.status === "done" ? (
          <Check className="size-3 text-primary-foreground" strokeWidth={3} />
        ) : task.status === "in_progress" ? (
          <span className="size-2 rounded-full bg-amber-500" />
        ) : null}
      </button>

      <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm",
              task.status === "done" && "text-muted-foreground line-through md:no-underline"
            )}
          >
            {task.title}
          </p>
          {task.status === "in_progress" ? (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-500 md:hidden">
              In progress
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {task.due_at ? (
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3.5" />
              {format(new Date(task.due_at), "d MMM, h:mm a")}
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
      </Link>

      {/* Desktop only — status is changed and the task is deleted from here
          instead of tapping the circle (mobile keeps that). */}
      {canMutate ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Task options"
              disabled={isPending}
              className="hidden size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 md:flex"
            >
              <MoreVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
