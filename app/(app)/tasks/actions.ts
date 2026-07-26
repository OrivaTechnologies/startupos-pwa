"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext, canMutate, PERMISSION_ERROR, type AccessContext } from "@/lib/access";
import { MY_TASKS_LIST_ID } from "@/lib/queries";
import type { TaskStatus } from "@/lib/supabase/types";

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

export async function createTaskList(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "List name is required" };

  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data, error } = await supabase
    .from("task_lists")
    .insert({ name: trimmed })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/tasks");
  return { id: data.id };
}

export async function renameTaskList(
  listId: string,
  name: string
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "List name is required" };

  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data: list, error: fetchError } = await supabase
    .from("task_lists")
    .select("user_id")
    .eq("id", listId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!list || !canMutate(access, list.user_id)) return { error: PERMISSION_ERROR };

  const { error } = await supabase
    .from("task_lists")
    .update({ name: trimmed })
    .eq("id", listId);
  if (error) return { error: error.message };

  revalidatePath("/tasks");
  return { id: listId };
}

export async function deleteTaskList(listId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };
  if (access.role !== "admin") return { error: PERMISSION_ERROR };

  // Tasks in this list cascade-delete via the list_id foreign key.
  const { error } = await supabase.from("task_lists").delete().eq("id", listId);
  if (error) return { error: error.message };

  revalidatePath("/tasks");
  return {};
}

export async function createTask(
  listId: string,
  title: string,
  description: string | null,
  dueAt: string | null,
  assigneeId: string | null,
  images: File[] = []
): Promise<ActionResult> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { error: "Task title is required" };

  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      list_id: listId === MY_TASKS_LIST_ID ? null : listId,
      title: trimmedTitle,
      description: description?.trim() || null,
      due_at: dueAt,
      assignee_id: assigneeId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await uploadTaskAttachments(supabase, data.id, access.userId, images);

  revalidatePath("/tasks");
  return { id: data.id };
}

export async function updateTask(
  taskId: string,
  title: string,
  description: string | null,
  dueAt: string | null,
  assigneeId: string | null,
  images: File[] = []
): Promise<ActionResult> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { error: "Task title is required" };

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
      title: trimmedTitle,
      description: description?.trim() || null,
      due_at: dueAt,
      assignee_id: assigneeId,
    })
    .eq("id", taskId);
  if (error) return { error: error.message };

  await uploadTaskAttachments(supabase, taskId, access.userId, images);

  revalidatePath("/tasks");
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

  revalidatePath("/tasks");
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

  revalidatePath("/tasks");
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

  revalidatePath("/tasks");
  return { id: taskId };
}
