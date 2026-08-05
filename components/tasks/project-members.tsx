"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { removeProjectMember } from "@/app/(app)/tasks/projects/actions";
import { AddMemberDialog } from "@/components/tasks/add-member-dialog";
import type { TaskMember } from "@/lib/queries";

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function ProjectMembers({
  projectId,
  members,
  allProfiles,
  isAdmin,
}: {
  projectId: string;
  members: TaskMember[];
  allProfiles: TaskMember[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const memberIds = new Set(members.map((m) => m.id));
  const addableProfiles = allProfiles.filter((p) => !memberIds.has(p.id));

  function handleRemove(userId: string) {
    startTransition(async () => {
      const result = await removeProjectMember(projectId, userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {isAdmin ? (
        <div className="flex justify-end">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add member
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {members.length === 0 ? (
          <div className="rounded-2xl border border-glass-border bg-glass px-6 py-10 text-center text-sm text-muted-foreground shadow-lg shadow-black/20 backdrop-blur-xl dark:bg-card/50">
            No members yet.
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-glass-border bg-glass px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-xl dark:bg-card/50"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-8 border border-border">
                  {member.avatarUrl ? (
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                  ) : null}
                  <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                    {initials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium">{member.name}</p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => handleRemove(member.id)}
                  disabled={isPending}
                  aria-label={`Remove ${member.name}`}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {isAdmin ? (
        <AddMemberDialog
          projectId={projectId}
          addableProfiles={addableProfiles}
          open={addOpen}
          onOpenChange={setAddOpen}
          onAdded={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
