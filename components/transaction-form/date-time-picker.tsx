"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  setHours,
  setMinutes,
  startOfMonth,
  subMonths,
} from "date-fns";
import { CalendarIcon, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/responsive-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function to12Hour(hours: number): { hour12: number; period: "AM" | "PM" } {
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return { hour12, period };
}

function to24Hour(hour12: number, period: "AM" | "PM") {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function DateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (isoValue: string) => void;
}) {
  const current = new Date(value);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(current);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(current));

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(current);
      setVisibleMonth(startOfMonth(current));
    }
    setOpen(next);
  }

  function selectDay(day: Date) {
    const next = new Date(draft);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    setDraft(next);
  }

  function selectHour(hour12: number) {
    const { period } = to12Hour(draft.getHours());
    setDraft(setHours(draft, to24Hour(hour12, period)));
  }

  function selectMinute(minute: number) {
    setDraft(setMinutes(draft, minute));
  }

  function selectPeriod(period: "AM" | "PM") {
    const { hour12 } = to12Hour(draft.getHours());
    setDraft(setHours(draft, to24Hour(hour12, period)));
  }

  function handleDone() {
    onChange(draft.toISOString());
    setOpen(false);
  }

  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart);
  const { hour12, period } = to12Hour(draft.getHours());

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-4 text-sm text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="size-4 text-muted-foreground" />
            {format(current, "d MMM yyyy")}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 text-muted-foreground" />
            {format(current, "hh:mm a")}
          </span>
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between space-y-0">
          <DrawerTitle>Date &amp; time</DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
            >
              <X className="size-4" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-medium">{format(visibleMonth, "MMMM yyyy")}</p>
            <button
              type="button"
              onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((day, i) => (
              <p key={`${day}-${i}`} className="text-xs text-muted-foreground">
                {day}
              </p>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {days.map((day) => {
              const selected = isSameDay(day, draft);
              const outOfMonth = !isSameMonth(day, visibleMonth);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "mx-auto flex size-9 items-center justify-center rounded-full text-sm transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-secondary",
                    outOfMonth && !selected && "text-muted-foreground/40",
                    !outOfMonth && !selected && isToday(day) && "ring-1 ring-primary text-primary"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Select value={String(hour12)} onValueChange={(v) => selectHour(Number(v))}>
              <SelectTrigger className="flex-1 justify-center">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select
              value={String(draft.getMinutes())}
              onValueChange={(v) => selectMinute(Number(v))}
            >
              <SelectTrigger className="flex-1 justify-center">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTES.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {String(m).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex overflow-hidden rounded-lg border border-input">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => selectPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={handleDone}>Done</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
