import type { ToolId } from "@/lib/supabase/types";

export type { ToolId };
// Alias used in UI/switcher contexts — same underlying value as ToolId,
// named for what it means to the user (which module they're viewing).
export type WorkspaceId = ToolId;

// Where a user lands when redirected into a given tool.
export const TOOL_HOME: Record<ToolId, string> = {
  ledger: "/home",
  tasks: "/tasks",
};
