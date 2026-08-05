"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { closeSprint } from "@/app/(app)/sprints/actions";
import { SPRINT_STATUS_LABEL, type SprintSummary } from "@/lib/sprints";
import { CreateSprintDialog } from "@/components/sprints/create-sprint-dialog";
import type { SprintStatus } from "@/lib/supabase/types";

const STATUS_BADGE_VARIANT: Record<SprintStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  upcoming: "secondary",
  closed: "outline",
};

export function SprintBoard({
  projectId,
  sprints,
  isAdmin,
}: {
  projectId: string;
  sprints: SprintSummary[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [closingSprint, setClosingSprint] = useState<SprintSummary | null>(null);
  const [isClosing, startClosing] = useTransition();

  function handleClose() {
    if (!closingSprint) return;
    startClosing(async () => {
      const result = await closeSprint(closingSprint.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setClosingSprint(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {isAdmin ? (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New sprint
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {sprints.length === 0 ? (
          <div className="rounded-2xl border border-glass-border bg-glass px-6 py-10 text-center text-sm text-muted-foreground shadow-lg shadow-black/20 backdrop-blur-xl dark:bg-card/50">
            No sprints yet.
          </div>
        ) : (
          sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-glass-border bg-glass px-5 py-4 shadow-lg shadow-black/20 backdrop-blur-xl dark:bg-card/50"
            >
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium">Sprint {sprint.number}</p>
                <Badge variant={STATUS_BADGE_VARIANT[sprint.status]}>
                  {SPRINT_STATUS_LABEL[sprint.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs text-muted-foreground">
                  {sprint.start_date} – {sprint.end_date}
                </p>
                {isAdmin && sprint.status === "active" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClosingSprint(sprint)}
                  >
                    Close sprint
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <CreateSprintDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => router.refresh()}
      />

      <AlertDialog
        open={!!closingSprint}
        onOpenChange={(open) => !open && setClosingSprint(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Sprint {closingSprint?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Incomplete tasks will move to the next queued sprint if one exists, otherwise
              they&apos;ll fall back to the backlog. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={isClosing}>
              {isClosing ? <Loader2 className="size-4 animate-spin" /> : null}
              Close sprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
