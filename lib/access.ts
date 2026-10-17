import "server-only";
import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";
import { canMutateRecord } from "@/lib/permissions";
import { getSessionContext, type SessionAccess } from "@/lib/session";
import { TOOL_HOME, type ToolId } from "@/lib/tools";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface AccessContext extends SessionAccess {
  role: UserRole;
  tools: ToolId[];
}

export const PERMISSION_ERROR = "You can only edit or delete records you created.";

export async function getAccessContext(_supabase: SupabaseClient): Promise<AccessContext | null> {
  return (await getSessionContext()).access;
}

export function canMutate(access: AccessContext | null, createdBy: string | null): boolean {
  return canMutateRecord(access?.role, access?.userId, createdBy);
}

// Page-level guard for tool-gated routes — redirects unauthenticated users
// to sign in, redirects users lacking `tool` to a tool they do have (or
// /unauthorized if they have none). RLS is the real security boundary;
// this exists purely so a locked-out user gets a sensible redirect instead
// of a broken/empty page.
export async function requireTool(supabase: SupabaseClient, tool: ToolId): Promise<AccessContext> {
  const access = await getAccessContext(supabase);
  if (!access) redirect("/");
  if (access.tools.includes(tool)) return access;

  const fallback = access.tools[0];
  redirect(fallback ? TOOL_HOME[fallback] : "/unauthorized");
}
