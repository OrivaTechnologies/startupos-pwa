"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { createTask } from "@/app/(app)/tasks/actions";
import { TaskFields, UNASSIGNED } from "@/components/tasks/task-fields";
import { BACKLOG_SPRINT_ID, type SprintSummary } from "@/lib/sprints";
import type { TaskMember } from "@/lib/queries";
import type { TaskType, TaskPriority } from "@/lib/supabase/types";

export function NewTaskForm({
  projectId,
  projectName,
  members,
  sprints,
  initialSprintId,
  mode = "page",
}: {
  projectId: string;
  projectName: string;
  members: TaskMember[];
  sprints: SprintSummary[];
  initialSprintId?: string;
  mode?: "modal" | "page";
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState(UNASSIGNED);
  const [sprintId, setSprintId] = useState(initialSprintId ?? BACKLOG_SPRINT_ID);
  const [taskType, setTaskType] = useState<TaskType>("other");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [images, setImages] = useState<File[]>([]);
  const [isSaving, startSaving] = useTransition();

  function close() {
    if (mode === "modal") router.back();
    else router.push("/tasks");
  }

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const resolvedAssigneeId = assigneeId === UNASSIGNED ? null : assigneeId;
    startSaving(async () => {
      const result = await createTask(
        projectId,
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
      // No router.refresh() here — createTask already revalidates the
      // /tasks layout server-side, and calling refresh() before close()
      // raced with the intercepted-route back-navigation, occasionally
      // rendering this modal as a full page instead of closing it.
      close();
    });
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
        <div className="flex-1">
          <h1 className="text-base font-semibold">New task</h1>
          <p className="text-xs text-muted-foreground">{projectName}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4">
        <TaskFields
          autoFocusTitle
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
        />
      </div>

      <div className="flex shrink-0 items-center justify-end border-t border-glass-border bg-glass px-4 py-3 backdrop-blur-xl dark:bg-card/50">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-black/20 transition-transform active:scale-95 disabled:opacity-40"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Add task
        </button>
      </div>
    </div>
  );
}
