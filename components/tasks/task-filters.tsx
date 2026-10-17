"use client";

import {
  Circle,
  CircleDot,
  CheckCircle2,
  Users,
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
import type { TaskStatus } from "@/lib/supabase/types";

export const ALL_FILTER = "all";

const STATUS_GLYPH: Record<TaskStatus, { icon: LucideIcon; className: string }> = {
  pending: { icon: Circle, className: "bg-secondary text-secondary-foreground" },
  in_progress: { icon: CircleDot, className: "bg-amber-500/15 text-amber-500" },
  done: { icon: CheckCircle2, className: "bg-primary/15 text-primary" },
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

export function TaskFilters({
  statusValue,
  onStatusChange,
  assigneeValue,
  onAssigneeChange,
  assigneeOptions,
  showAssigneeFilter = true,
  className,
}: {
  statusValue: string;
  onStatusChange: (value: string) => void;
  assigneeValue: string;
  onAssigneeChange: (value: string) => void;
  assigneeOptions: [string, string][];
  showAssigneeFilter?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
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
      {showAssigneeFilter ? (
        <AssigneeFilterSelect
          value={assigneeValue}
          onValueChange={onAssigneeChange}
          options={assigneeOptions}
        />
      ) : null}
    </div>
  );
}
