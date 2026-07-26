"use client";

import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/responsive-sheet";
import { CategoryIcon } from "@/lib/categories";
import type { Database } from "@/lib/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

export function CategoryPickerSheet({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value?: string;
  onChange: (categoryId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === value);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button type="button" className="flex w-full items-center gap-3 py-2 text-left">
          <CategoryIcon icon={selected?.icon ?? "ellipsis"} className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">
            {selected?.name ?? "Select category"}
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between space-y-0">
          <DrawerTitle>Select category</DrawerTitle>
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
        <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto px-4 pb-6">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                onChange(category.id);
                setOpen(false);
              }}
              className="flex flex-col items-center gap-2 rounded-lg p-2 text-center"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <CategoryIcon icon={category.icon} className="size-5" />
              </span>
              <span className="text-xs leading-tight">{category.name}</span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
