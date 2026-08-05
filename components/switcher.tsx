"use client";

import { useState } from "react";
import { Check, ChevronRight, Pencil, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/responsive-sheet";

export interface SwitcherOption {
  id: string;
  label: string;
  // Lucide icon for fixed-identity options (e.g. workspaces).
  icon?: LucideIcon;
  // Presence of this key (even when null) marks an option as
  // avatar-style (e.g. projects) — renders a photo with an
  // initials fallback instead of an icon box.
  avatarUrl?: string | null;
}

function initials(label: string) {
  return (
    label
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

function OptionGlyph({ option, className }: { option: SwitcherOption; className?: string }) {
  if (option.avatarUrl !== undefined) {
    return (
      <Avatar className={cn("border border-border", className)}>
        {option.avatarUrl ? <AvatarImage src={option.avatarUrl} alt={option.label} /> : null}
        <AvatarFallback className="bg-secondary text-[10px] text-secondary-foreground">
          {initials(option.label)}
        </AvatarFallback>
      </Avatar>
    );
  }
  if (option.icon) {
    const Icon = option.icon;
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-secondary text-secondary-foreground",
          className
        )}
      >
        <Icon className="size-3.5" />
      </div>
    );
  }
  return null;
}

export interface SwitcherConfirm {
  title: (option: SwitcherOption) => string;
  description?: (option: SwitcherOption) => string;
}

export interface SwitcherExtraAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

// The options sheet used by mobile-context switchers (Profile page's card
// row, the avatar's long-press menu) where a centered dialog/bottom-sheet is
// the right shell — the sidebar's compact row uses a right-anchored
// DropdownMenu instead (see SwitcherRow's "compact" branch below), since
// there's room to flyout beside the trigger there.
export function SwitcherDrawer({
  open,
  onOpenChange,
  title,
  options,
  currentId,
  onSelect,
  confirm,
  extraAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: SwitcherOption[];
  currentId?: string;
  onSelect: (id: string) => void;
  confirm?: SwitcherConfirm;
  extraAction?: SwitcherExtraAction;
}) {
  const [pending, setPending] = useState<SwitcherOption | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) setPending(null);
    onOpenChange(next);
  }

  function handlePick(option: SwitcherOption) {
    if (option.id === currentId) {
      onOpenChange(false);
      return;
    }
    if (confirm) {
      setPending(option);
      return;
    }
    onOpenChange(false);
    onSelect(option.id);
  }

  function handleConfirm() {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    onOpenChange(false);
    onSelect(id);
  }

  function handleExtraAction() {
    onOpenChange(false);
    extraAction?.onClick();
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="sm:max-w-sm">
        <DrawerHeader>
          <DrawerTitle>{pending && confirm ? confirm.title(pending) : title}</DrawerTitle>
        </DrawerHeader>

        {pending && confirm ? (
          <div className="flex flex-col gap-4 px-4 pb-4">
            {confirm.description ? (
              <p className="text-sm text-muted-foreground">{confirm.description(pending)}</p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                Switch
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-4 pb-4">
            {options.map((option) => {
              const isActive = option.id === currentId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handlePick(option)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                    isActive ? "bg-secondary" : "hover:bg-secondary/60"
                  )}
                >
                  <OptionGlyph option={option} className="size-9" />
                  <span className="flex-1 truncate text-sm font-medium">{option.label}</span>
                  {isActive ? <Check className="size-4 text-primary" /> : null}
                </button>
              );
            })}
            {extraAction ? (
              <button
                type="button"
                onClick={handleExtraAction}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <div className="flex size-9 items-center justify-center rounded-lg">
                  {extraAction.icon ? <extraAction.icon className="size-4" /> : <Plus className="size-4" />}
                </div>
                {extraAction.label}
              </button>
            ) : null}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

export function SwitcherRow({
  label,
  current,
  emptyLabel = "None",
  options,
  onSelect,
  confirm,
  extraAction,
  onEdit,
  variant = "card",
}: {
  label: string;
  current?: SwitcherOption;
  emptyLabel?: string;
  options: SwitcherOption[];
  onSelect: (id: string) => void;
  confirm?: SwitcherConfirm;
  extraAction?: SwitcherExtraAction;
  // Shown as a pencil icon on the current option's row (compact variant
  // only) — e.g. the sidebar's Project switcher opens its Edit/Delete
  // dialog from here instead of a separate button underneath.
  onEdit?: (option: SwitcherOption) => void;
  variant?: "card" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<SwitcherOption | null>(null);

  if (variant === "compact") {
    function handlePick(option: SwitcherOption) {
      if (option.id === current?.id) return;
      if (confirm) {
        setPendingConfirm(option);
        return;
      }
      onSelect(option.id);
    }

    function handleConfirm() {
      if (!pendingConfirm) return;
      onSelect(pendingConfirm.id);
      setPendingConfirm(null);
    }

    return (
      <div>
        <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mb-2 flex h-10 w-full items-center gap-2 rounded-lg border border-border px-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/60 data-[state=open]:bg-secondary"
            >
              {current ? <OptionGlyph option={current} className="size-6" /> : null}
              <span className="flex-1 truncate">{current?.label ?? emptyLabel}</span>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-56">
            {options.map((option) => {
              const isActive = option.id === current?.id;
              return (
                <DropdownMenuItem
                  key={option.id}
                  onSelect={(e) => {
                    if (isActive) {
                      e.preventDefault();
                      return;
                    }
                    handlePick(option);
                  }}
                  className="gap-2"
                >
                  <OptionGlyph option={option} className="size-6" />
                  <span className="flex-1 truncate">{option.label}</span>
                  {isActive ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                  {isActive && onEdit ? (
                    <button
                      type="button"
                      aria-label={`Edit ${option.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit(option);
                      }}
                      className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  ) : null}
                </DropdownMenuItem>
              );
            })}
            {extraAction ? (
              <DropdownMenuItem onSelect={() => extraAction.onClick()} className="gap-2 text-muted-foreground">
                {extraAction.icon ? <extraAction.icon className="size-4" /> : <Plus className="size-4" />}
                {extraAction.label}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        {confirm ? (
          <AlertDialog open={!!pendingConfirm} onOpenChange={(next) => !next && setPendingConfirm(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{pendingConfirm ? confirm.title(pendingConfirm) : ""}</AlertDialogTitle>
                {pendingConfirm && confirm.description ? (
                  <AlertDialogDescription>{confirm.description(pendingConfirm)}</AlertDialogDescription>
                ) : null}
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPendingConfirm(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>Switch</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="px-1 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <Card className="p-0">
        <div className="flex items-center gap-3 px-4 py-3">
          {current ? <OptionGlyph option={current} className="size-9" /> : null}
          <p className="flex-1 text-sm font-medium">{current?.label ?? emptyLabel}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm font-medium text-primary"
          >
            Change
          </button>
        </div>
      </Card>

      <SwitcherDrawer
        open={open}
        onOpenChange={setOpen}
        title={label}
        options={options}
        currentId={current?.id}
        onSelect={onSelect}
        confirm={confirm}
        extraAction={extraAction}
      />
    </div>
  );
}
