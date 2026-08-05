"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ProjectFormDialog } from "@/components/tasks/project-form-dialog";

export function NoProjectsEmptyState({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-glass-border bg-glass px-6 py-12 text-center shadow-lg shadow-black/20 backdrop-blur-xl dark:bg-card/50">
      <p className="text-sm text-muted-foreground">
        {isAdmin
          ? "No projects yet."
          : "No projects yet. Ask an admin to create one and add you as a member."}
      </p>
      {isAdmin ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
        >
          <Plus className="size-4" />
          Create project
        </button>
      ) : null}

      <ProjectFormDialog
        mode="create"
        open={open}
        onOpenChange={setOpen}
        onSaved={(project) => {
          router.push(`/tasks?project=${project.id}`);
          router.refresh();
        }}
      />
    </div>
  );
}
