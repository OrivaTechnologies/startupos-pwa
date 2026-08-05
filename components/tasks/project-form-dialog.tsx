"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { ProjectAvatarPicker } from "@/components/tasks/project-avatar-picker";
import { createProject, updateProject, deleteProject } from "@/app/(app)/tasks/projects/actions";
import type { ProjectSummary } from "@/lib/task-projects";

export function ProjectFormDialog({
  mode,
  project,
  blockers,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  mode: "create" | "edit";
  project?: ProjectSummary;
  blockers?: { sprintCount: number; taskCount: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (project: { id: string }) => void;
  onDeleted?: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [keyPrefix, setKeyPrefix] = useState(project?.keyPrefix ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function resetAndClose() {
    setAvatarFile(null);
    setRemoveAvatar(false);
    onOpenChange(false);
  }

  function handleSave() {
    if (!name.trim() || !keyPrefix.trim()) return;
    startSaving(async () => {
      const result =
        mode === "create"
          ? await createProject(name, keyPrefix, avatarFile)
          : await updateProject(project!.id, name, keyPrefix, avatarFile, removeAvatar);
      if (result.error || !result.id) {
        toast.error(result.error ?? "Could not save project");
        return;
      }
      onSaved({ id: result.id });
      if (mode === "create") {
        setName("");
        setKeyPrefix("");
      }
      resetAndClose();
    });
  }

  const canDelete =
    mode === "edit" && !!blockers && blockers.sprintCount === 0 && blockers.taskCount === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : resetAndClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "New project" : "Edit project"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <ProjectAvatarPicker
              name={name || "Project"}
              existingUrl={removeAvatar ? null : project?.avatarUrl ?? null}
              onFileChange={(file) => {
                setAvatarFile(file);
                if (file) setRemoveAvatar(false);
              }}
              onRemoveExisting={() => setRemoveAvatar(true)}
            />

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Project name
              </span>
              <Input
                autoFocus
                placeholder="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Key prefix
              </span>
              <Input
                placeholder="PROJ"
                value={keyPrefix}
                maxLength={10}
                onChange={(e) => setKeyPrefix(e.target.value.toUpperCase())}
              />
              <span className="text-xs text-muted-foreground">
                Used to number tasks, e.g. {keyPrefix || "PROJ"}-12
              </span>
            </label>
          </div>

          <DialogFooter className="flex-row items-center justify-between">
            {mode === "edit" ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                disabled={!canDelete}
                title={
                  canDelete
                    ? "Delete project"
                    : "Remove all sprints and tasks from this project before deleting it."
                }
                aria-label="Delete project"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={handleSave} disabled={isSaving || !name.trim() || !keyPrefix.trim()}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "create" ? "Create project" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mode === "edit" && project ? (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete this project?"
          description={`"${project.name}" will be permanently removed. This can't be undone.`}
          onConfirm={async () => {
            const result = await deleteProject(project.id);
            if (!result.error) {
              onOpenChange(false);
              onDeleted?.();
            }
            return result;
          }}
        />
      ) : null}
    </>
  );
}
