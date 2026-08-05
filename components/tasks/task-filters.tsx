"use client";

import {
  Circle,
  CircleDot,
  CheckCircle2,
  Minus,
  ArrowUp,
  OctagonAlert,
  Bug,
  Sparkles,
  TrendingUp,
  Shapes,
  Users,
  Flag,
  Layers,
  ListFilter,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUS_ORDER, TASK_STATUS_LABEL } from "@/lib/task-status";
import { TASK_TYPE_ORDER, TASK_TYPE_LABEL, TASK_PRIORITY_ORDER, TASK_PRIORITY_LABEL } from "@/lib/task-meta";
import type { TaskStatus, TaskType, TaskPriority } from "@/lib/supabase/types";

export const ALL_FILTER = "all";

const STATUS_GLYPH: Record<TaskStatus, { icon: LucideIcon; className: string }> = {
  todo: { icon: Circle, className: "bg-secondary text-secondary-foreground" },
  in_progress: { icon: CircleDot, className: "bg-amber-500/15 text-amber-500" },
  done: { icon: CheckCircle2, className: "bg-primary/15 text-primary" },
};

const PRIORITY_GLYPH: Record<TaskPriority, { icon: LucideIcon; className: string }> = {
  low: { icon: Circle, className: "bg-secondary text-secondary-foreground" },
  medium: { icon: Minus, className: "bg-sky-500/15 text-sky-500" },
  high: { icon: ArrowUp, className: "bg-amber-500/15 text-amber-500" },
  critical: { icon: OctagonAlert, className: "bg-destructive/15 text-destructive" },
};

const TYPE_GLYPH: Record<TaskType, { icon: LucideIcon; className: string }> = {
  bug: { icon: Bug, className: "bg-destructive/15 text-destructive" },
  new_requirement: { icon: Sparkles, className: "bg-sky-500/15 text-sky-500" },
  enhancement: { icon: TrendingUp, className: "bg-primary/15 text-primary" },
  other: { icon: Shapes, className: "bg-secondary text-secondary-foreground" },
};

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

interface GlyphOption {
  value: string;
  label: string;
  icon: LucideIcon;
  className: string;
}

// One pill-style filter: an icon + label trigger (highlighted when a
// specific value is picked) opening a list of icon-boxed options, each
// tinted to match its meaning (priority severity, status progress, etc).
function GlyphFilterSelect({
  value,
  onValueChange,
  allLabel,
  allIcon: AllIcon,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  allLabel: string;
  allIcon: LucideIcon;
  options: GlyphOption[];
}) {
  const isActive = value !== ALL_FILTER;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-9 gap-2 rounded-full border px-3.5",
          isActive
            ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
            : "border-border text-foreground"
        )}
      >
        {/* SelectValue mirrors the selected item's own children (icon +
            label), so no separate icon is rendered here — adding one would
            just duplicate it. */}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_FILTER} className={cn("gap-2.5", !isActive && "text-primary")}>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md",
              !isActive ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground"
            )}
          >
            <AllIcon className="size-3.5" />
          </span>
          {allLabel}
        </SelectItem>
        <SelectSeparator />
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn("gap-2.5", value === option.value && "text-primary")}
          >
            <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", option.className)}>
              <option.icon className="size-3.5" />
            </span>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AssigneeFilterSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: [string, string][];
}) {
  const isActive = value !== ALL_FILTER;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-9 gap-2 rounded-full border px-3.5",
          isActive
            ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
            : "border-border text-foreground"
        )}
      >
        {/* SelectValue mirrors the selected item's own children (avatar +
            name), so no separate avatar is rendered here — adding one
            would just duplicate it. */}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_FILTER} className={cn("gap-2.5", !isActive && "text-primary")}>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md",
              !isActive ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground"
            )}
          >
            <Users className="size-3.5" />
          </span>
          All assignees
        </SelectItem>
        <SelectSeparator />
        {options.map(([id, name]) => (
          <SelectItem key={id} value={id} className={cn("gap-2.5", value === id && "text-primary")}>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground">
              {initials(name)}
            </span>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Shared by the Backlog list (all four filters) and the Kanban board
// (assignee/priority/type only — status is already the column split).
export function TaskFilters({
  statusValue,
  onStatusChange,
  assigneeValue,
  onAssigneeChange,
  assigneeOptions,
  priorityValue,
  onPriorityChange,
  typeValue,
  onTypeChange,
  className,
}: {
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  assigneeValue: string;
  onAssigneeChange: (value: string) => void;
  assigneeOptions: [string, string][];
  priorityValue: string;
  onPriorityChange: (value: string) => void;
  typeValue: string;
  onTypeChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {statusValue !== undefined && onStatusChange ? (
        <GlyphFilterSelect
          value={statusValue}
          onValueChange={onStatusChange}
          allLabel="All statuses"
          allIcon={ListFilter}
          options={TASK_STATUS_ORDER.map((s) => ({
            value: s,
            label: TASK_STATUS_LABEL[s],
            ...STATUS_GLYPH[s],
          }))}
        />
      ) : null}

      <AssigneeFilterSelect value={assigneeValue} onValueChange={onAssigneeChange} options={assigneeOptions} />

      <GlyphFilterSelect
        value={priorityValue}
        onValueChange={onPriorityChange}
        allLabel="All priorities"
        allIcon={Flag}
        options={TASK_PRIORITY_ORDER.map((p) => ({
          value: p,
          label: TASK_PRIORITY_LABEL[p],
          ...PRIORITY_GLYPH[p],
        }))}
      />

      <GlyphFilterSelect
        value={typeValue}
        onValueChange={onTypeChange}
        allLabel="All types"
        allIcon={Layers}
        options={TASK_TYPE_ORDER.map((t) => ({
          value: t,
          label: TASK_TYPE_LABEL[t],
          ...TYPE_GLYPH[t],
        }))}
      />
    </div>
  );
}
