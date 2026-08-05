import type { SprintStatus } from "@/lib/supabase/types";

// Sentinel id for "no sprint assigned" (tasks.sprint_id null) — a project's
// Backlog. Not a row in the sprints table.
export const BACKLOG_SPRINT_ID = "backlog";

export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  closed: "Closed",
};

export interface SprintSummary {
  id: string;
  number: number;
  start_date: string;
  end_date: string;
  status: SprintStatus;
}
