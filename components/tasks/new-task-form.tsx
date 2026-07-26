"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { createTask } from "@/app/(app)/tasks/actions";
import { TaskFields, UNASSIGNED } from "@/components/tasks/task-fields";
import type { TaskMember } from "@/lib/queries";

export function NewTaskForm({
  listId,
  listName,
  members,
  mode = "page",
}: {
  listId: string;
  listName: string;
  members: TaskMember[];
  mode?: "modal" | "page";
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState(UNASSIGNED);
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
        listId,
        trimmed,
        description,
        dueAt,
        resolvedAssigneeId,
        images
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
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
          <p className="text-xs text-muted-foreground">{listName}</p>
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
