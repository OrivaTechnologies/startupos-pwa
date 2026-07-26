"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth, startOfYear, subDays } from "date-fns";
import { Filter, FolderKanban, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const DATE_PRESETS = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-30", label: "Last 30 days" },
  { value: "this-year", label: "This year" },
  { value: "custom", label: "Custom" },
] as const;

type DatePreset = (typeof DATE_PRESETS)[number]["value"];

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
        selected ? "border-primary" : "border-muted-foreground"
      )}
    >
      {selected ? <span className="size-2.5 rounded-full bg-primary" /> : null}
    </span>
  );
}

function presetFor(from?: string, to?: string): DatePreset {
  return from || to ? "custom" : "all";
}

export function TransactionFilterSheet({
  projects,
  activeType,
  activeProjectId,
  activeFrom,
  activeTo,
}: {
  projects: Project[];
  activeType?: "expense" | "income" | "transfer";
  activeProjectId?: string;
  activeFrom?: string;
  activeTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(activeProjectId);
  const [preset, setPreset] = useState<DatePreset>(presetFor(activeFrom, activeTo));
  const [customFrom, setCustomFrom] = useState(activeFrom ?? "");
  const [customTo, setCustomTo] = useState(activeTo ?? "");

  const hasActiveFilters = Boolean(activeProjectId || activeFrom || activeTo);

  function navigate(params: { projectId?: string; from?: string; to?: string }) {
    const search = new URLSearchParams();
    if (activeType) search.set("type", activeType);
    if (params.projectId) search.set("project", params.projectId);
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
    const query = search.toString();
    router.push(query ? `/transactions?${query}` : "/transactions");
    setOpen(false);
  }

  function handleApply() {
    const now = new Date();
    if (preset === "all") {
      navigate({ projectId });
      return;
    }
    if (preset === "custom") {
      navigate({ projectId, from: customFrom || undefined, to: customTo || undefined });
      return;
    }
    if (preset === "this-month") {
      navigate({
        projectId,
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      });
      return;
    }
    if (preset === "last-30") {
      navigate({
        projectId,
        from: format(subDays(now, 29), "yyyy-MM-dd"),
        to: format(now, "yyyy-MM-dd"),
      });
      return;
    }
    if (preset === "this-year") {
      navigate({
        projectId,
        from: format(startOfYear(now), "yyyy-MM-dd"),
        to: format(now, "yyyy-MM-dd"),
      });
    }
  }

  function handleClear() {
    setProjectId(undefined);
    setPreset("all");
    setCustomFrom("");
    setCustomTo("");
    navigate({});
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          aria-label="Filter transactions"
          className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          <Filter className="size-4" />
          {hasActiveFilters ? (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" />
          ) : null}
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between space-y-0">
          <DrawerTitle>Filter transactions</DrawerTitle>
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
        <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto px-4">
          <div>
            <p className="pb-2 text-xs uppercase text-muted-foreground">Project</p>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setProjectId(undefined)}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
              >
                <RadioDot selected={!projectId} />
                <span className="text-sm text-muted-foreground">All projects</span>
              </button>
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setProjectId(project.id)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
                >
                  <RadioDot selected={project.id === projectId} />
                  <span className="flex size-8 items-center justify-center rounded-lg bg-secondary">
                    <FolderKanban className="size-4" />
                  </span>
                  <span className="text-sm">{project.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="pb-2 text-xs uppercase text-muted-foreground">Date</p>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPreset(p.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium",
                    preset === p.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset === "custom" ? (
              <div className="flex items-center gap-2 pt-3" data-vaul-no-drag>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="flex-1 border-none bg-transparent shadow-none dark:bg-transparent"
                  data-vaul-no-drag
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="flex-1 border-none bg-transparent shadow-none dark:bg-transparent"
                  data-vaul-no-drag
                />
              </div>
            ) : null}
          </div>
        </div>
        <DrawerFooter className="flex-row">
          <Button variant="outline" className="flex-1" onClick={handleClear}>
            Clear
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
