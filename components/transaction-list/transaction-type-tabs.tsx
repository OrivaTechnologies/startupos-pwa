"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: undefined, label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
] as const;

export function TransactionTypeTabs() {
  const searchParams = useSearchParams();
  const activeType = searchParams.get("type");
  const project = searchParams.get("project");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  return (
    <div className="flex gap-2 overflow-x-auto">
      {FILTERS.map((filter) => {
        const params = new URLSearchParams();
        if (filter.value) params.set("type", filter.value);
        if (project) params.set("project", project);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const query = params.toString();
        const selected = (filter.value ?? null) === (activeType === "expense" || activeType === "income" || activeType === "transfer" ? activeType : null);
        return (
          <Link
            key={filter.label}
            href={query ? `/transactions?${query}` : "/transactions"}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
              selected
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground"
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
