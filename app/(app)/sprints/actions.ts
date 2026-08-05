"use server";

import { revalidatePath } from "next/cache";
import { addDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/access";

type ActionResult = { error?: string; id?: string };

const ADMIN_ONLY_ERROR = "Only admins can manage sprints.";

function nextDay(dateStr: string): string {
  return format(addDays(new Date(`${dateStr}T00:00:00`), 1), "yyyy-MM-dd");
}

export async function createSprint(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult> {
  if (!startDate || !endDate) return { error: "Start and end dates are required" };
  if (endDate < startDate) return { error: "End date must be on or after the start date" };

  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };
  if (access.role !== "admin") return { error: ADMIN_ONLY_ERROR };

  const [{ data: latestSprint, error: latestError }, { data: activeSprint, error: activeError }] =
    await Promise.all([
      supabase
        .from("sprints")
        .select("end_date")
        .eq("project_id", projectId)
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sprints")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "active")
        .maybeSingle(),
    ]);
  if (latestError) return { error: latestError.message };
  if (activeError) return { error: activeError.message };

  if (latestSprint) {
    const requiredStart = nextDay(latestSprint.end_date);
    if (startDate !== requiredStart) {
      return {
        error: `To keep sprints back-to-back, the next sprint must start on ${requiredStart} (the day after the latest sprint ends).`,
      };
    }
  }

  const { data, error } = await supabase
    .from("sprints")
    .insert({
      project_id: projectId,
      start_date: startDate,
      end_date: endDate,
      status: activeSprint ? "upcoming" : "active",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/sprints", "layout");
  revalidatePath("/tasks", "layout");
  return { id: data.id };
}

export async function closeSprint(sprintId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };
  if (access.role !== "admin") return { error: ADMIN_ONLY_ERROR };

  const { data: sprint, error: fetchError } = await supabase
    .from("sprints")
    .select("id, project_id, end_date, status")
    .eq("id", sprintId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!sprint) return { error: "Sprint not found" };
  if (sprint.status !== "active") return { error: "Only the active sprint can be closed" };

  const { data: nextSprint, error: nextError } = await supabase
    .from("sprints")
    .select("id")
    .eq("project_id", sprint.project_id)
    .eq("status", "upcoming")
    .eq("start_date", nextDay(sprint.end_date))
    .maybeSingle();
  if (nextError) return { error: nextError.message };

  const { error: closeError } = await supabase
    .from("sprints")
    .update({ status: "closed" })
    .eq("id", sprintId);
  if (closeError) return { error: closeError.message };

  // Incomplete tasks roll into the next contiguous sprint if one is queued
  // up, otherwise they fall back to the backlog (sprint_id null).
  const { error: rolloverError } = await supabase
    .from("tasks")
    .update({ sprint_id: nextSprint?.id ?? null })
    .eq("sprint_id", sprintId)
    .neq("status", "done");
  if (rolloverError) return { error: rolloverError.message };

  if (nextSprint) {
    const { error: activateError } = await supabase
      .from("sprints")
      .update({ status: "active" })
      .eq("id", nextSprint.id);
    if (activateError) return { error: activateError.message };
  }

  revalidatePath("/sprints", "layout");
  revalidatePath("/tasks", "layout");
  return { id: sprintId };
}
