"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext, canMutate, PERMISSION_ERROR, type AccessContext } from "@/lib/access";
import { dueAtEndOfIstDay } from "@/lib/datetime";
import type { TaskStatus } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ActionResult = { error?: string; id?: string; attachmentWarning?: string };

function canMutateTask(
  access: AccessContext,
  task: { user_id: string; assignee_id: string | null }
): boolean {
  return canMutate(access, task.user_id) || canMutate(access, task.assignee_id);
}

function attachmentFilesFromForm(formData: FormData): File[] {
  return formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
}

function parseTaskFields(formData: FormData): {
  title: string;
  description: string | null;
  dueAt: string | null;
  assigneeId: string | null;
  error?: string;
} {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { title: "", description: null, dueAt: null, assigneeId: null, error: "Task title is required" };

  const descriptionRaw = formData.get("description");
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim() ? descriptionRaw.trim() : null;

  const dueRaw = formData.get("due_at");
  const dueAt =
    typeof dueRaw === "string" && dueRaw ? dueAtEndOfIstDay(dueRaw) : null;
  if (typeof dueRaw === "string" && dueRaw && !dueAt) {
    return { title: "", description: null, dueAt: null, assigneeId: null, error: "Pick a valid due date." };
  }

  const assigneeRaw = formData.get("assignee_id");
  const assigneeId =
    typeof assigneeRaw === "string" && assigneeRaw && assigneeRaw !== "unassigned"
      ? assigneeRaw
      : null;

  return { title, description, dueAt, assigneeId };
}

async function resolveAssigneeId(
  supabase: SupabaseServerClient,
  assigneeId: string | null
): Promise<{ assigneeId: string | null; error?: string }> {
  if (!assigneeId) return { assigneeId: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", assigneeId)
    .maybeSingle();
  if (error) return { assigneeId: null, error: error.message };
  if (!profile) return { assigneeId: null, error: "Assignee not found." };
  return { assigneeId };
}

async function uploadTaskAttachments(
  supabase: SupabaseServerClient,
  taskId: string,
  userId: string,
  files: File[]
): Promise<string | undefined> {
  if (files.length === 0) return undefined;

  const failures: string[] = [];
  for (const file of files) {
    const path = `${taskId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("task-attachments")
      .upload(path, file);
    if (uploadError) {
      failures.push(file.name);
      continue;
    }
    const { error: insertError } = await supabase.from("task_attachments").insert({
      task_id: taskId,
      storage_path: path,
      file_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
      uploaded_by: userId,
    });
    if (insertError) {
      console.error("Failed to record task attachment after upload:", insertError);
      await supabase.storage.from("task-attachments").remove([path]);
      failures.push(file.name);
    }
  }

  if (failures.length === files.length) {
    return "Task saved, but attachments could not be uploaded. Try again from the task detail screen.";
  }
  if (failures.length > 0) {
    return `Some attachments failed to upload: ${failures.join(", ")}`;
  }
  return undefined;
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const parsed = parseTaskFields(formData);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const resolvedAssignee = await resolveAssigneeId(supabase, parsed.assigneeId);
  if (resolvedAssignee.error) return { error: resolvedAssignee.error };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: parsed.title,
      description: parsed.description,
      due_at: parsed.dueAt,
      assignee_id: resolvedAssignee.assigneeId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const attachmentWarning = await uploadTaskAttachments(
    supabase,
    data.id,
    access.userId,
    attachmentFilesFromForm(formData)
  );

  revalidatePath("/tasks", "layout");
  return { id: data.id, attachmentWarning };
}

export async function updateTask(taskId: string, formData: FormData): Promise<ActionResult> {
  const parsed = parseTaskFields(formData);
  if (parsed.error) return { error: parsed.error };

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

  const resolvedAssignee =
    parsed.assigneeId === task.assignee_id
      ? { assigneeId: task.assignee_id }
      : await resolveAssigneeId(supabase, parsed.assigneeId);
  if (resolvedAssignee.error) return { error: resolvedAssignee.error };

  const { error } = await supabase
    .from("tasks")
    .update({
      title: parsed.title,
      description: parsed.description,
      due_at: parsed.dueAt,
      assignee_id: resolvedAssignee.assigneeId,
    })
    .eq("id", taskId);
  if (error) return { error: error.message };

  const attachmentWarning = await uploadTaskAttachments(
    supabase,
    taskId,
    access.userId,
    attachmentFilesFromForm(formData)
  );

  revalidatePath("/tasks", "layout");
  return { id: taskId, attachmentWarning };
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

export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("user_id, assignee_id, archived_at")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!task || !canMutateTask(access, task)) return { error: PERMISSION_ERROR };
  if (task.archived_at) return { error: "Unarchive this task before changing its status." };

  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) return { error: error.message };

  revalidatePath("/tasks", "layout");
  return { id: taskId };
}

export async function setTaskArchived(taskId: string, archived: boolean): Promise<ActionResult> {
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

  const { error } = await supabase
    .from("tasks")
    .update({
      archived_at: archived ? new Date().toISOString() : null,
      archived_by: archived ? access.userId : null,
    })
    .eq("id", taskId);
  if (error) return { error: error.message };

  revalidatePath("/tasks", "layout");
  return { id: taskId };
}
