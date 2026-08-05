"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronDown,
  Check,
  CircleDot,
  UserPen,
  CalendarPlus,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canMutateRecord } from "@/lib/permissions";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  updateTask,
  deleteTask,
  setTaskStatus,
  deleteTaskAttachment,
} from "@/app/(app)/tasks/actions";
import { TASK_STATUS_ORDER, TASK_STATUS_LABEL } from "@/lib/task-status";
import { TaskFields, UNASSIGNED } from "@/components/tasks/task-fields";
import { BACKLOG_SPRINT_ID, type SprintSummary } from "@/lib/sprints";
import type { TaskDetailData, TaskMember, TaskAttachmentWithUrl } from "@/lib/queries";
import type { TaskStatus, UserRole, TaskType, TaskPriority } from "@/lib/supabase/types";

function StatusDropdown({
  status,
  isToggling,
  disabled,
  onChange,
}: {
  status: TaskStatus;
  isToggling: boolean;
  disabled: boolean;
  onChange: (status: TaskStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled || isToggling}
          aria-label={`Status: ${TASK_STATUS_LABEL[status]} — change`}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
            status === "done"
              ? "bg-primary text-primary-foreground"
              : status === "in_progress"
                ? "bg-amber-500/15 text-amber-500"
                : "border border-border bg-secondary text-secondary-foreground"
          )}
        >
          {isToggling ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : status === "in_progress" ? (
            <CircleDot className="size-3.5" />
          ) : (
            <Check className="size-3.5" strokeWidth={status === "done" ? 3 : 2} />
          )}
          {TASK_STATUS_LABEL[status]}
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={status} onValueChange={(value) => onChange(value as TaskStatus)}>
          {TASK_STATUS_ORDER.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {TASK_STATUS_LABEL[s]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TaskDetail({
  task,
  keyPrefix,
  members,
  sprints,
  creatorName,
  initialAttachments = [],
  currentUserId,
  currentUserRole,
  mode = "page",
}: {
  task: TaskDetailData;
  keyPrefix: string;
  members: TaskMember[];
  sprints: SprintSummary[];
  creatorName: string | null;
  initialAttachments?: TaskAttachmentWithUrl[];
  currentUserId?: string;
  currentUserRole?: UserRole;
  mode?: "modal" | "page";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueAt, setDueAt] = useState<string | null>(task.due_at);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? UNASSIGNED);
  const [sprintId, setSprintId] = useState(task.sprint_id ?? BACKLOG_SPRINT_ID);
  const [taskType, setTaskType] = useState<TaskType>(task.task_type);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState(task.status);
  const [images, setImages] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState(initialAttachments);
  const [isSaving, startSaving] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canMutate =
    canMutateRecord(currentUserRole, currentUserId, task.user_id) ||
    canMutateRecord(currentUserRole, currentUserId, task.assignee_id);

  function close() {
    if (mode === "modal") router.back();
    else router.push("/tasks");
  }

  function changeStatus(next: TaskStatus) {
    if (next === status) return;
    startToggle(async () => {
      const result = await setTaskStatus(task.id, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setStatus(next);
    });
  }

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const resolvedAssigneeId = assigneeId === UNASSIGNED ? null : assigneeId;
    startSaving(async () => {
      const result = await updateTask(
        task.id,
        trimmed,
        description,
        dueAt,
        resolvedAssigneeId,
        images,
        sprintId,
        taskType,
        priority
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // No router.refresh() here — updateTask already revalidates the
      // /tasks layout server-side, and calling refresh() before close()
      // raced with the intercepted-route back-navigation, occasionally
      // rendering this modal as a full page instead of closing it.
      close();
    });
  }

  async function handleDelete() {
    const result = await deleteTask(task.id);
    if (result?.error) return { error: result.error };
    close();
    return {};
  }

  async function handleRemoveExistingAttachment(attachmentId: string) {
    const previous = existingAttachments;
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    const result = await deleteTaskAttachment(attachmentId);
    if (result.error) {
      toast.error(result.error);
      setExistingAttachments(previous);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-glass-border bg-glass px-4 py-3 backdrop-blur-xl dark:bg-card/50">
        <button
          type="button"
          onClick={close}
          aria-label="Back"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="flex-1 text-base font-semibold">
          Task <span className="text-muted-foreground">{keyPrefix}-{task.number}</span>
        </h1>
        <StatusDropdown
          status={status}
          isToggling={isToggling}
          disabled={!canMutate}
          onChange={changeStatus}
        />
        {canMutate ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete task"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4">
        <TaskFields
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          assigneeId={assigneeId}
          onAssigneeChange={setAssigneeId}
          dueAt={dueAt}
          onDueAtChange={setDueAt}
          sprintId={sprintId}
          onSprintChange={setSprintId}
          sprints={sprints}
          taskType={taskType}
          onTaskTypeChange={setTaskType}
          priority={priority}
          onPriorityChange={setPriority}
          members={members}
          images={images}
          onImagesChange={setImages}
          existingAttachments={existingAttachments}
          onRemoveExistingAttachment={canMutate ? handleRemoveExistingAttachment : undefined}
          disabled={!canMutate}
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {creatorName ? (
            <div className="flex items-center gap-1.5">
              <UserPen className="size-3.5" />
              Created by {creatorName}
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            <CalendarPlus className="size-3.5" />
            Created {format(new Date(task.created_at), "d MMM yyyy, h:mm a")}
          </div>
        </div>
      </div>

      {canMutate ? (
        <div className="flex shrink-0 items-center justify-end border-t border-glass-border bg-glass px-4 py-3 backdrop-blur-xl dark:bg-card/50">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-black/20 transition-transform active:scale-95 disabled:opacity-40"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </button>
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
