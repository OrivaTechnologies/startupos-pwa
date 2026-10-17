import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";
import type { ToolId } from "@/lib/tools";

const ALL_TOOLS: ToolId[] = ["ledger", "tasks"];

export interface SessionProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface SessionAccess {
  userId: string;
  role: UserRole;
  tools: ToolId[];
}

// One auth check and one profile read per server request. Layouts, pages,
// and actions in that request share the result. This is React's per-request
// cache, not a shared cache, so one user's session never leaks to another.
export const getSessionContext = cache(async (): Promise<{
  profile: SessionProfile | null;
  access: SessionAccess | null;
}> => {
  const started = Date.now();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { profile: null, access: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return { profile: null, access: null };

  let tools: ToolId[];
  if (profile.role === "admin") {
    tools = ALL_TOOLS;
  } else {
    const { data: grants } = await supabase
      .from("user_tool_access")
      .select("tool")
      .eq("user_id", userId);
    tools = (grants ?? []).map((grant) => grant.tool);
  }

  if (process.env.NODE_ENV === "development") {
    const elapsed = Date.now() - started;
    if (elapsed > 250) console.info(`[perf] session context ${elapsed}ms`);
  }

  return {
    profile,
    access: { userId: profile.id, role: profile.role, tools },
  };
});
