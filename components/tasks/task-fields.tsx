"use client";

import { X, CalendarClock, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateTimePicker } from "@/components/transaction-form/date-time-picker";
import { AttachmentUploader } from "@/components/transaction-form/attachment-uploader";
import { BACKLOG_SPRINT_ID, type SprintSummary } from "@/lib/sprints";
import { TASK_TYPE_ORDER, TASK_TYPE_LABEL, TASK_PRIORITY_ORDER, TASK_PRIORITY_LABEL } from "@/lib/task-meta";
import type { TaskMember, TaskAttachmentWithUrl } from "@/lib/queries";
import type { TaskType, TaskPriority } from "@/lib/supabase/types";

export const UNASSIGNED = "unassigned";

function sprintLabel(sprint: SprintSummary) {
  return sprint.status === "active" ? `Sprint ${sprint.number} (Active)` : `Sprint ${sprint.number}`;
}

function memberInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

function MemberOption({ member }: { member: TaskMember }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar className="size-6 border border-border">
        {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={member.name} /> : null}
        <AvatarFallback className="bg-secondary text-[10px] text-secondary-foreground">
          {memberInitials(member.name)}
        </AvatarFallback>
      </Avatar>
      {member.name}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </span>
  );
}

export function TaskFields({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  assigneeId,
  onAssigneeChange,
  dueAt,
  onDueAtChange,
  sprintId,
  onSprintChange,
  sprints,
  taskType,
  onTaskTypeChange,
  priority,
  onPriorityChange,
  members,
  images,
  onImagesChange,
  existingAttachments,
  onRemoveExistingAttachment,
  disabled = false,
  autoFocusTitle = false,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  assigneeId: string;
  onAssigneeChange: (value: string) => void;
  dueAt: string | null;
  onDueAtChange: (value: string | null) => void;
  sprintId: string;
  onSprintChange: (value: string) => void;
  sprints: SprintSummary[];
  taskType: TaskType;
  onTaskTypeChange: (value: TaskType) => void;
  priority: TaskPriority;
  onPriorityChange: (value: TaskPriority) => void;
  members: TaskMember[];
  images: File[];
  onImagesChange: (files: File[]) => void;
  existingAttachments?: TaskAttachmentWithUrl[];
  onRemoveExistingAttachment?: (id: string) => void;
  disabled?: boolean;
  autoFocusTitle?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <FieldLabel>Title</FieldLabel>
        <Input
          className="h-11 px-3.5"
          autoFocus={autoFocusTitle}
          placeholder="What needs to be done?"
          value={title}
          disabled={disabled}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <FieldLabel>Description</FieldLabel>
        <Textarea
          placeholder="Add more details (optional)"
          value={description}
          disabled={disabled}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </label>

      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Assignee</FieldLabel>
          <Select value={assigneeId} onValueChange={onAssigneeChange} disabled={disabled}>
            <SelectTrigger size="lg" className="w-full px-3.5">
              <SelectValue placeholder="Assign to" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>
                <span className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground">
                    <UserRound className="size-3.5" />
                  </span>
                  Unassigned
                </span>
              </SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <MemberOption member={member} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Due date</FieldLabel>
          {dueAt ? (
            <div className="flex h-11 items-center justify-between rounded-lg border border-input px-3">
              <DateTimePicker value={dueAt} onChange={onDueAtChange} />
              <button
                type="button"
                aria-label="Remove due date"
                disabled={disabled}
                onClick={() => onDueAtChange(null)}
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onDueAtChange(new Date().toISOString())}
              className="flex h-11 items-center gap-2 rounded-lg border border-dashed border-input px-3 text-sm text-muted-foreground transition-colors hover:border-solid hover:text-foreground disabled:opacity-50"
            >
              <CalendarClock className="size-4" />
              Set a due date &amp; time
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 md:grid md:grid-cols-3 md:gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Sprint</FieldLabel>
          <Select value={sprintId} onValueChange={onSprintChange} disabled={disabled}>
            <SelectTrigger size="lg" className="w-full px-3.5">
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BACKLOG_SPRINT_ID}>Backlog</SelectItem>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  {sprintLabel(sprint)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Type</FieldLabel>
          <Select
            value={taskType}
            onValueChange={(value) => onTaskTypeChange(value as TaskType)}
            disabled={disabled}
          >
            <SelectTrigger size="lg" className="w-full px-3.5">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPE_ORDER.map((type) => (
                <SelectItem key={type} value={type}>
                  {TASK_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Priority</FieldLabel>
          <Select
            value={priority}
            onValueChange={(value) => onPriorityChange(value as TaskPriority)}
            disabled={disabled}
          >
            <SelectTrigger size="lg" className="w-full px-3.5">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {TASK_PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Attachments</FieldLabel>
        <AttachmentUploader
          value={images}
          onChange={onImagesChange}
          existingReceipts={existingAttachments}
          onRemoveExisting={onRemoveExistingAttachment}
          fileAccept="image/*"
        />
      </div>
    </div>
  );
}
