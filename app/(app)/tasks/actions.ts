"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext, canMutate, PERMISSION_ERROR, type AccessContext } from "@/lib/access";
import { BACKLOG_SPRINT_ID } from "@/lib/sprints";
import type { TaskStatus, TaskType, TaskPriority } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// A task may only be (re)assigned to the backlog or a sprint that's still
// open for planning (active or upcoming) in the same project — closed
// sprints are history, and a sprint from a different project isn't valid
// here even if the caller happens to be a member of that project too.
async function resolveSprintId(
  supabase: SupabaseServerClient,
  projectId: string,
  sprintId: string | null
): Promise<{ sprintId: string | null; error?: string }> {
  if (!sprintId || sprintId === BACKLOG_SPRINT_ID) return { sprintId: null };

  const { data: sprint, error } = await supabase
    .from("sprints")
    .select("status, project_id")
    .eq("id", sprintId)
    .maybeSingle();
  if (error) return { sprintId: null, error: error.message };
  if (
    !sprint ||
    sprint.project_id !== projectId ||
    (sprint.status !== "active" && sprint.status !== "upcoming")
  ) {
    return {
      sprintId: null,
      error: "Tasks can only be assigned to the backlog or an open sprint in this project.",
    };
  }
  return { sprintId };
}

// An assignee must be a Member of the task's project.
async function resolveAssigneeId(
  supabase: SupabaseServerClient,
  projectId: string,
  assigneeId: string | null
): Promise<{ assigneeId: string | null; error?: string }> {
  if (!assigneeId) return { assigneeId: null };

  const { data: member, error } = await supabase
    .from("task_project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", assigneeId)
    .maybeSingle();
  if (error) return { assigneeId: null, error: error.message };
  if (!member) return { assigneeId: null, error: "Assignee must be a member of this project." };
  return { assigneeId };
}

type ActionResult = { error?: string; id?: string };

function canMutateTask(
  access: AccessContext,
  task: { user_id: string; assignee_id: string | null }
): boolean {
  return canMutate(access, task.user_id) || canMutate(access, task.assignee_id);
}

async function uploadTaskAttachments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
  userId: string,
  files: File[]
) {
  for (const file of files) {
    if (file.size === 0) continue;
    const path = `${taskId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("task-attachments")
      .upload(path, file);
    if (uploadError) continue;
    const { error: insertError } = await supabase.from("task_attachments").insert({
      task_id: taskId,
      storage_path: path,
      file_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
      uploaded_by: userId,
    });
    if (insertError) {
      // Row insert failed after the file already landed in storage — remove
      // it so we don't leave an orphaned object with no DB reference.
      console.error("Failed to record task attachment after upload:", insertError);
      await supabase.storage.from("task-attachments").remove([path]);
    }
  }
}

export async function createTask(
  projectId: string,
  title: string,
  description: string | null,
  dueAt: string | null,
  assigneeId: string | null,
  images: File[] = [],
  sprintId: string | null = null,
  taskType: TaskType = "other",
  priority: TaskPriority = "medium"
): Promise<ActionResult> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { error: "Task title is required" };

  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const [resolvedSprint, resolvedAssignee] = await Promise.all([
    resolveSprintId(supabase, projectId, sprintId),
    resolveAssigneeId(supabase, projectId, assigneeId),
  ]);
  if (resolvedSprint.error) return { error: resolvedSprint.error };
  if (resolvedAssignee.error) return { error: resolvedAssignee.error };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      title: trimmedTitle,
      description: description?.trim() || null,
      due_at: dueAt,
      assignee_id: resolvedAssignee.assigneeId,
      sprint_id: resolvedSprint.sprintId,
      task_type: taskType,
      priority,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await uploadTaskAttachments(supabase, data.id, access.userId, images);

  revalidatePath("/tasks", "layout");
  return { id: data.id };
}

export async function updateTask(
  taskId: string,
  title: string,
  description: string | null,
  dueAt: string | null,
  assigneeId: string | null,
  images: File[] = [],
  sprintId: string | null = null,
  taskType: TaskType = "other",
  priority: TaskPriority = "medium"
): Promise<ActionResult> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { error: "Task title is required" };

  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("user_id, assignee_id, sprint_id, project_id")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!task || !canMutateTask(access, task)) return { error: PERMISSION_ERROR };

  // Leaving a task's sprint assignment untouched must always be allowed,
  // even if that sprint has since closed (e.g. saving an unrelated edit on
  // a done task that stayed on its now-closed sprint) — only a *new*
  // assignment is restricted to the backlog or an open sprint. Same idea
  // for the assignee: someone can be removed from a project after being
  // assigned, and unrelated edits shouldn't be blocked by that.
  const resolvedSprint =
    sprintId === task.sprint_id
      ? { sprintId: task.sprint_id }
      : await resolveSprintId(supabase, task.project_id, sprintId);
  if (resolvedSprint.error) return { error: resolvedSprint.error };

  const resolvedAssignee =
    assigneeId === task.assignee_id
      ? { assigneeId: task.assignee_id }
      : await resolveAssigneeId(supabase, task.project_id, assigneeId);
  if (resolvedAssignee.error) return { error: resolvedAssignee.error };

  const { error } = await supabase
    .from("tasks")
    .update({
      title: trimmedTitle,
      description: description?.trim() || null,
      due_at: dueAt,
      assignee_id: resolvedAssignee.assigneeId,
      sprint_id: resolvedSprint.sprintId,
      task_type: taskType,
      priority,
    })
    .eq("id", taskId);
  if (error) return { error: error.message };

  await uploadTaskAttachments(supabase, taskId, access.userId, images);

  revalidatePath("/tasks", "layout");
  return { id: taskId };
}

export async function deleteTaskAttachment(attachmentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data: attachment, error: fetchError } = await supabase
    .from("task_attachments")
    .select("storage_path, task_id, tasks(user_id, assignee_id)")
    .eq("id", attachmentId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!attachment) return { error: "Attachment not found" };

  const task = (
    attachment as unknown as {
      tasks: { user_id: string; assignee_id: string | null } | null;
    }
  ).tasks;
  if (!task || !canMutateTask(access, task)) return { error: PERMISSION_ERROR };

  const { error: deleteError } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId);
  if (deleteError) return { error: deleteError.message };

  await supabase.storage.from("task-attachments").remove([attachment.storage_path]);

  revalidatePath("/tasks", "layout");
  return {};
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("user_id, assignee_id")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!task || !canMutateTask(access, task)) return { error: PERMISSION_ERROR };

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };

  revalidatePath("/tasks", "layout");
  return {};
}

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("user_id, assignee_id")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!task || !canMutateTask(access, task)) return { error: PERMISSION_ERROR };

  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) return { error: error.message };

  revalidatePath("/tasks", "layout");
  return { id: taskId };
}
