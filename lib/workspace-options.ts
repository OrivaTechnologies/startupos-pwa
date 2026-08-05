import { Landmark, ListChecks, type LucideIcon } from "lucide-react";
import type { useRouter } from "next/navigation";
import { TOOL_HOME, type WorkspaceId } from "@/lib/tools";

export interface WorkspaceOption {
  id: WorkspaceId;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { id: "ledger", label: "Ledger", href: TOOL_HOME.ledger, icon: Landmark },
  { id: "tasks", label: "Tasks", href: TOOL_HOME.tasks, icon: ListChecks },
];

// Consolidates the cookie-set-then-navigate sequence every workspace
// switcher needs: the (app) layout reads this cookie to render the
// sidebar, but Next.js reuses cached layout output across client
// navigations — refresh() forces it to re-render with the new value.
export function switchWorkspace(id: WorkspaceId, router: ReturnType<typeof useRouter>) {
  document.cookie = `active_workspace=${id}; path=/; max-age=31536000; samesite=lax`;
  const target = WORKSPACE_OPTIONS.find((w) => w.id === id);
  if (target) router.push(target.href);
  router.refresh();
}
