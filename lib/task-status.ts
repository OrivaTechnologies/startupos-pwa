import type { TaskStatus } from "@/lib/supabase/types";

export const TASK_STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "done"];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

// Tapping a task's status control advances it to the next stage, wrapping
// back to "pending" so a done task can be reopened.
export function nextTaskStatus(status: TaskStatus): TaskStatus {
  const index = TASK_STATUS_ORDER.indexOf(status);
  return TASK_STATUS_ORDER[(index + 1) % TASK_STATUS_ORDER.length];
}
