"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { canMutateRecord } from "@/lib/permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setTaskStatus } from "@/app/(app)/tasks/actions";
import { TASK_STATUS_ORDER, TASK_STATUS_LABEL } from "@/lib/task-status";
import { TASK_TYPE_LABEL, TASK_PRIORITY_LABEL } from "@/lib/task-meta";
import { PRIORITY_BADGE_CLASS } from "@/components/tasks/task-row";
import { TaskFilters, ALL_FILTER } from "@/components/tasks/task-filters";
import type { BoardTask } from "@/lib/queries";
import type { TaskStatus, UserRole } from "@/lib/supabase/types";

// Returns false on the server and on the client's first (hydrating) render,
// then true from then on — the react.dev-documented way to render
// differently after mount without the "setState in an effect" anti-pattern.
function subscribeNoop() {
  return () => {};
}
function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

function assigneeInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

function BoardCard({
  task,
  keyPrefix,
  canDrag,
}: {
  task: BoardTask;
  keyPrefix: string;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-glass-border bg-glass px-3.5 py-3 shadow-md shadow-black/10 backdrop-blur-xl dark:bg-card/50",
        canDrag ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-default",
        isDragging && "z-10"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{keyPrefix}-{task.number}</span>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            PRIORITY_BADGE_CLASS[task.priority]
          )}
        >
          {TASK_PRIORITY_LABEL[task.priority]}
        </span>
      </div>

      <Link href={`/tasks/detail/${task.id}`} className="text-sm hover:underline">
        {task.title}
      </Link>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{TASK_TYPE_LABEL[task.task_type]}</span>
        <div className="flex items-center gap-2">
          {task.due_at ? (
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3.5" />
              {format(new Date(task.due_at), "d MMM")}
            </span>
          ) : null}
          {task.assigneeName ? (
            <Avatar className="size-5">
              {task.assigneeAvatarUrl ? (
                <AvatarImage src={task.assigneeAvatarUrl} alt={task.assigneeName} />
              ) : null}
              <AvatarFallback className="bg-secondary text-[9px] text-secondary-foreground">
                {assigneeInitials(task.assigneeName)}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BoardColumn({
  status,
  tasks,
  keyPrefix,
  currentUserId,
  currentUserRole,
}: {
  status: TaskStatus;
  tasks: BoardTask[];
  keyPrefix: string;
  currentUserId?: string;
  currentUserRole?: UserRole;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-80 shrink-0 flex-col gap-2.5 rounded-2xl border border-glass-border bg-glass/50 p-3 backdrop-blur-xl transition-colors dark:bg-card/30",
        isOver && "ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold">{TASK_STATUS_LABEL[status]}</p>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>

      <div className="flex min-h-24 flex-col gap-2.5">
        {tasks.map((task) => {
          const canDrag =
            canMutateRecord(currentUserRole, currentUserId, task.user_id) ||
            canMutateRecord(currentUserRole, currentUserId, task.assignee_id);
          return <BoardCard key={task.id} task={task} keyPrefix={keyPrefix} canDrag={canDrag} />;
        })}
        {tasks.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">No tasks</p>
        ) : null}
      </div>
    </div>
  );
}

export function BoardColumns({
  tasks,
  keyPrefix,
  currentUserId,
  currentUserRole,
}: {
  tasks: BoardTask[];
  keyPrefix: string;
  currentUserId?: string;
  currentUserRole?: UserRole;
}) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [prevTasks, setPrevTasks] = useState(tasks);
  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setLocalTasks(tasks);
  }

  // @dnd-kit generates accessibility ids (e.g. "DndDescribedBy-N") from a
  // module-level counter rather than React's SSR-safe useId(), so the
  // number it lands on server-side (shared across requests on the same
  // Node process) almost never matches a fresh client render — a
  // hydration mismatch on every load. Rendering the DnD tree only after
  // mount sidesteps it entirely: there's nothing server-rendered to
  // mismatch against.
  const mounted = useMounted();

  const [assigneeFilter, setAssigneeFilter] = useState(ALL_FILTER);
  const [priorityFilter, setPriorityFilter] = useState(ALL_FILTER);
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
  const [, startSaving] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const assigneeOptions = Array.from(
    new Map(
      localTasks
        .filter((t) => t.assignee_id && t.assigneeName)
        .map((t) => [t.assignee_id as string, t.assigneeName as string])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filteredTasks = localTasks
    .filter((t) => assigneeFilter === ALL_FILTER || t.assignee_id === assigneeFilter)
    .filter((t) => priorityFilter === ALL_FILTER || t.priority === priorityFilter)
    .filter((t) => typeFilter === ALL_FILTER || t.task_type === typeFilter);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = localTasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previous = localTasks;
    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    startSaving(async () => {
      const result = await setTaskStatus(taskId, newStatus);
      if (result.error) {
        toast.error(result.error);
        setLocalTasks(previous);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <TaskFilters
        assigneeValue={assigneeFilter}
        onAssigneeChange={setAssigneeFilter}
        assigneeOptions={assigneeOptions}
        priorityValue={priorityFilter}
        onPriorityChange={setPriorityFilter}
        typeValue={typeFilter}
        onTypeChange={setTypeFilter}
      />

      {mounted ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {TASK_STATUS_ORDER.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                tasks={filteredTasks.filter((t) => t.status === status)}
                keyPrefix={keyPrefix}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {TASK_STATUS_ORDER.map((status) => (
            <div
              key={status}
              className="flex w-80 shrink-0 flex-col gap-2.5 rounded-2xl border border-glass-border bg-glass/50 p-3 backdrop-blur-xl dark:bg-card/30"
            >
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-semibold">{TASK_STATUS_LABEL[status]}</p>
              </div>
              <div className="min-h-24 animate-pulse rounded-xl bg-secondary/40" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
