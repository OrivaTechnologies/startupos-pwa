"use client";

import { useState, useTransition } from "react";
import { Folder, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/responsive-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createProject } from "@/app/(app)/transactions/actions";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
        selected ? "border-primary" : "border-muted-foreground"
      )}
    >
      {selected ? <span className="size-2.5 rounded-full bg-primary" /> : null}
    </span>
  );
}

export function ProjectPickerSheet({
  projects,
  value,
  onChange,
  onCreated,
}: {
  projects: Project[];
  value?: string;
  onChange: (projectId: string | undefined) => void;
  onCreated: (project: Project) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const selected = projects.find((p) => p.id === value);

  function select(id: string | undefined) {
    onChange(id);
    setOpen(false);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createProject(name);
      if (result.error || !result.id) {
        toast.error(result.error ?? "Could not create project");
        return;
      }
      const project = { id: result.id, name, created_by: null, is_archived: false, created_at: new Date().toISOString() };
      onCreated(project);
      onChange(project.id);
      setNewName("");
      setOpen(false);
    });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg py-2 text-left transition-colors hover:bg-white/5">
          <Folder
            className={cn("size-4 shrink-0 text-muted-foreground", !selected && "opacity-40")}
          />
          <span className="flex-1 text-sm font-medium">
            {selected?.name ?? "Select project"}
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between space-y-0">
          <DrawerTitle>Select project</DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
            >
              <X className="size-4" />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="flex max-h-[45vh] flex-col gap-1 overflow-y-auto px-4">
          <button
            type="button"
            onClick={() => select(undefined)}
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
          >
            <RadioDot selected={!value} />
            <span className="text-sm text-muted-foreground">None</span>
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => select(project.id)}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
            >
              <RadioDot selected={project.id === value} />
              <span className="flex size-8 items-center justify-center rounded-lg bg-secondary">
                <Folder className="size-4" />
              </span>
              <span className="text-sm">{project.name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-border px-4 py-4">
          <Input
            placeholder="New project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-11"
          />
          <Button
            size="icon"
            className="size-11"
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            aria-label="Create project"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
