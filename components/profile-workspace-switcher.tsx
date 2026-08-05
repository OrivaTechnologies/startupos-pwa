"use client";

import { useRouter } from "next/navigation";
import { SwitcherRow } from "@/components/switcher";
import { WORKSPACE_OPTIONS, switchWorkspace } from "@/lib/workspace-options";
import type { WorkspaceId } from "@/lib/tools";

export function ProfileWorkspaceSwitcher({ active }: { active: WorkspaceId }) {
  const router = useRouter();
  const current = WORKSPACE_OPTIONS.find((w) => w.id === active)!;

  return (
    <SwitcherRow
      label="Active workspace"
      variant="card"
      current={{ id: current.id, label: current.label, icon: current.icon }}
      options={WORKSPACE_OPTIONS}
      onSelect={(id) => switchWorkspace(id as WorkspaceId, router)}
      confirm={{
        title: (option) => `Switch to ${option.label}?`,
        description: () => "You'll leave what you're doing here and switch context.",
      }}
    />
  );
}
