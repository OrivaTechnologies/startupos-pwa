"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/access";
import { getProjectDeletionBlockers } from "@/lib/queries";

type ActionResult = { error?: string; id?: string };
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const ADMIN_ONLY_ERROR = "Only admins can manage projects.";
const KEY_PREFIX_RE = /^[A-Z][A-Z0-9]{1,9}$/;

function normalizeKeyPrefix(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim().toUpperCase();
  if (!value) return { ok: false, error: "Key prefix is required" };
  if (!KEY_PREFIX_RE.test(value)) {
    return {
      ok: false,
      error: "Key prefix must be 2-10 letters/numbers, starting with a letter (e.g. CTZN).",
    };
  }
  return { ok: true, value };
}

async function uploadProjectAvatar(
  supabase: SupabaseServerClient,
  projectId: string,
  file: File
): Promise<{ path?: string; error?: string }> {
  const path = `${projectId}/avatar`;
  const { error } = await supabase.storage
    .from("project-avatars")
    .upload(path, file, { upsert: true });
  if (error) return { error: error.message };
  return { path };
}

// Read, but lives here (not lib/queries.ts) so client components — the
// sidebar's Edit button — can call it directly like any other action.
export async function getProjectBlockers(
  projectId: string
): Promise<{ sprintCount: number; taskCount: number }> {
  const supabase = await createClient();
  return getProjectDeletionBlockers(supabase, projectId);
}

export async function createProject(
  name: string,
  keyPrefix: string,
  avatarFile: File | null = null
): Promise<ActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Project name is required" };
  const normalizedPrefix = normalizeKeyPrefix(keyPrefix);
  if (!normalizedPrefix.ok) return { error: normalizedPrefix.error };

  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };
  if (access.role !== "admin") return { error: ADMIN_ONLY_ERROR };

  const { data, error } = await supabase
    .from("task_projects")
    .insert({ name: trimmedName, key_prefix: normalizedPrefix.value })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { error: "That prefix is already in use by another project." };
    }
    return { error: error.message };
  }

  // The creating admin doesn't strictly need a membership row (admins
  // bypass is_task_project_member everywhere), but adding one means they
  // show up in the Members list and assignee dropdown immediately.
  const { error: memberError } = await supabase
    .from("task_project_members")
    .insert({ project_id: data.id, user_id: access.userId });
  if (memberError) return { error: memberError.message };

  if (avatarFile && avatarFile.size > 0) {
    const uploaded = await uploadProjectAvatar(supabase, data.id, avatarFile);
    if (uploaded.error) return { error: uploaded.error };
    const { error: avatarError } = await supabase
      .from("task_projects")
      .update({ avatar_path: uploaded.path })
      .eq("id", data.id);
    if (avatarError) return { error: avatarError.message };
  }

  // "layout" invalidates app/(app)/layout.tsx (which fetches the sidebar's
  // taskProjects list) plus every nested Tasks page in one call — a plain
  // revalidatePath("/tasks") only busts that one page, leaving /tasks/board,
  // /sprints, /tasks/members, and the sidebar itself stale.
  revalidatePath("/tasks", "layout");
  return { id: data.id };
}

export async function updateProject(
  projectId: string,
  name: string,
  keyPrefix: string,
  avatarFile: File | null = null,
  removeAvatar: boolean = false
): Promise<ActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Project name is required" };
  const normalizedPrefix = normalizeKeyPrefix(keyPrefix);
  if (!normalizedPrefix.ok) return { error: normalizedPrefix.error };

  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };
  if (access.role !== "admin") return { error: ADMIN_ONLY_ERROR };

  let avatarPath: string | null | undefined;
  if (removeAvatar) {
    await supabase.storage.from("project-avatars").remove([`${projectId}/avatar`]);
    avatarPath = null;
  } else if (avatarFile && avatarFile.size > 0) {
    const uploaded = await uploadProjectAvatar(supabase, projectId, avatarFile);
    if (uploaded.error) return { error: uploaded.error };
    avatarPath = uploaded.path;
  }

  const { error } = await supabase
    .from("task_projects")
    .update({
      name: trimmedName,
      key_prefix: normalizedPrefix.value,
      ...(avatarPath !== undefined ? { avatar_path: avatarPath } : {}),
    })
    .eq("id", projectId);
  if (error) {
    if (error.code === "23505") {
      return { error: "That prefix is already in use by another project." };
    }
    return { error: error.message };
  }

  revalidatePath("/tasks", "layout");
  return { id: projectId };
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };
  if (access.role !== "admin") return { error: ADMIN_ONLY_ERROR };

  const { data: project, error: fetchError } = await supabase
    .from("task_projects")
    .select("avatar_path")
    .eq("id", projectId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase.from("task_projects").delete().eq("id", projectId);
  if (error) {
    if (error.code === "23503") {
      return { error: "This project still has sprints or tasks — remove them first." };
    }
    return { error: error.message };
  }

  if (project?.avatar_path) {
    await supabase.storage.from("project-avatars").remove([project.avatar_path]);
  }

  revalidatePath("/tasks", "layout");
  return {};
}

export async function addProjectMember(projectId: string, userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };
  if (access.role !== "admin") return { error: ADMIN_ONLY_ERROR };

  const { error } = await supabase
    .from("task_project_members")
    .insert({ project_id: projectId, user_id: userId });
  if (error) return { error: error.message };

  // A newly added member's own sidebar/pages need this project to appear —
  // see the comment in createProject above for why "layout" (not "page").
  revalidatePath("/tasks", "layout");
  return {};
}

export async function removeProjectMember(projectId: string, userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };
  if (access.role !== "admin") return { error: ADMIN_ONLY_ERROR };

  const { error } = await supabase
    .from("task_project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/tasks", "layout");
  return {};
}
