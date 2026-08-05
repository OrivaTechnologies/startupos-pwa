"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { addProjectMember } from "@/app/(app)/tasks/projects/actions";
import type { TaskMember } from "@/lib/queries";

export function AddMemberDialog({
  projectId,
  addableProfiles,
  open,
  onOpenChange,
  onAdded,
}: {
  projectId: string;
  addableProfiles: TaskMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [isAdding, startAdding] = useTransition();

  function handleAdd() {
    if (!selected) return;
    startAdding(async () => {
      const result = await addProjectMember(projectId, selected);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSelected("");
      onOpenChange(false);
      onAdded();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>

        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger size="lg" className="w-full px-3.5">
            <SelectValue placeholder="Choose a person" />
          </SelectTrigger>
          <SelectContent>
            {addableProfiles.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Everyone is already a member
              </div>
            ) : (
              addableProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button onClick={handleAdd} disabled={isAdding || !selected}>
            {isAdding ? <Loader2 className="size-4 animate-spin" /> : null}
            Add member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
