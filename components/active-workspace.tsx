"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, ListChecks, Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TOOL_HOME, type ToolId } from "@/lib/tools";

export type WorkspaceId = ToolId;

const WORKSPACES: Record<
  WorkspaceId,
  { label: string; href: string; icon: typeof Landmark }
> = {
  ledger: { label: "Ledger", href: TOOL_HOME.ledger, icon: Landmark },
  tasks: { label: "Tasks", href: TOOL_HOME.tasks, icon: ListChecks },
};

const WORKSPACE_IDS = Object.keys(WORKSPACES) as WorkspaceId[];

export function ActiveWorkspace({ active }: { active: WorkspaceId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const current = WORKSPACES[active];
  const CurrentIcon = current.icon;

  function select(id: WorkspaceId) {
    setOpen(false);
    if (id === active) return;
    document.cookie = `active_workspace=${id}; path=/; max-age=31536000; samesite=lax`;
    router.push(WORKSPACES[id].href);
    // The (app) layout reads this cookie to render the sidebar, but Next.js
    // reuses cached layout output across client navigations — refresh()
    // forces it to re-render with the new cookie value.
    router.refresh();
  }

  return (
    <div>
      <p className="px-1 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Active workspace
      </p>
      <Card className="p-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <CurrentIcon className="size-4" />
          </div>
          <p className="flex-1 text-sm font-medium">{current.label}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm font-medium text-primary"
          >
            Change
          </button>
        </div>
      </Card>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Switch workspace</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col gap-1 px-4 pb-6">
            {WORKSPACE_IDS.map((id) => {
              const workspace = WORKSPACES[id];
              const Icon = workspace.icon;
              const isActive = id === active;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => select(id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                    isActive ? "bg-secondary" : "hover:bg-secondary/60"
                  )}
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-background text-foreground">
                    <Icon className="size-4" />
                  </div>
                  <span className="flex-1 text-sm font-medium">{workspace.label}</span>
                  {isActive ? <Check className="size-4 text-primary" /> : null}
                </button>
              );
            })}
          </div>

          <DrawerClose className="sr-only">Close</DrawerClose>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
