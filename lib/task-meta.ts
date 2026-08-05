import type { TaskType, TaskPriority } from "@/lib/supabase/types";

export const TASK_TYPE_ORDER: TaskType[] = ["bug", "new_requirement", "enhancement", "other"];

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  bug: "Bug",
  new_requirement: "New Requirement",
  enhancement: "Enhancement",
  other: "Other",
};

export const TASK_PRIORITY_ORDER: TaskPriority[] = ["low", "medium", "high", "critical"];

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};
