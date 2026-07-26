"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/responsive-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTaskList } from "@/app/(app)/tasks/actions";

export function CreateListSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (list: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [isCreating, startCreating] = useTransition();

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startCreating(async () => {
      const result = await createTaskList(trimmed);
      if (result.error || !result.id) {
        toast.error(result.error ?? "Could not create list");
        return;
      }
      onCreated({ id: result.id, name: trimmed });
      setName("");
      onOpenChange(false);
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-sm">
        <DrawerHeader className="flex-row items-center justify-between space-y-0">
          <DrawerTitle>New list</DrawerTitle>
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

        <div className="px-4 pt-1 pb-4">
          <Input
            autoFocus
            placeholder="List name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
        </div>

        <DrawerFooter>
          <Button
            variant="tasks"
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="w-full"
          >
            {isCreating ? <Loader2 className="size-4 animate-spin" /> : null}
            Create list
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
