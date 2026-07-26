"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronRight, Plus, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/responsive-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentModeIcon } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { createPaymentMode } from "@/app/(app)/accounts/actions";
import type { Database, PaymentModeKind } from "@/lib/supabase/types";

const KIND_LABELS: Record<PaymentModeKind, string> = {
  upi: "UPI",
  cheque: "Cheque",
  internet_banking: "Internet Banking",
  debit_card: "Debit Card",
};

const KIND_OPTIONS: { value: PaymentModeKind; label: string }[] = [
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "internet_banking", label: "Internet Banking" },
  { value: "debit_card", label: "Debit Card" },
];

type PaymentMode = Database["public"]["Tables"]["payment_modes"]["Row"];

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

export function PaymentModePickerSheet({
  accountId,
  paymentModes,
  value,
  onChange,
  onCreated,
  disabled,
}: {
  accountId?: string;
  paymentModes: PaymentMode[];
  value?: string;
  onChange: (paymentModeId: string | undefined) => void;
  onCreated?: (paymentMode: PaymentMode) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<PaymentModeKind>("upi");
  const [isCreating, startCreating] = useTransition();
  const selected = paymentModes.find((m) => m.id === value);

  function select(id: string | undefined) {
    onChange(id);
    setOpen(false);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name || !accountId) return;
    startCreating(async () => {
      const result = await createPaymentMode(accountId, name, newKind);
      if (result.error || !result.id) {
        toast.error(result.error ?? "Could not create payment mode");
        return;
      }
      const mode: PaymentMode = {
        id: result.id,
        account_id: accountId,
        name,
        kind: newKind,
        is_archived: false,
        sort_order: 0,
        created_by: null,
        created_at: new Date().toISOString(),
      };
      onCreated?.(mode);
      onChange(mode.id);
      setNewName("");
      setNewKind("upi");
      setOpen(false);
    });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex w-full items-center gap-3 rounded-lg py-2 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
        >
          <PaymentModeIcon
            kind={selected?.kind ?? "upi"}
            className={cn("size-4 shrink-0", !selected && "opacity-40")}
          />
          <span className="flex-1">
            <span className="block text-sm font-medium">
              {selected?.name ?? "Select payment mode"}
            </span>
            {selected ? (
              <span className="block text-xs text-muted-foreground">
                {KIND_LABELS[selected.kind]}
              </span>
            ) : null}
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between space-y-0">
          <DrawerTitle>Select Payment Mode</DrawerTitle>
          <div className="flex items-center gap-2">
            <DrawerClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              >
                <X className="size-4" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex max-h-[45vh] flex-col gap-1 overflow-y-auto px-4 pb-2">
          <button
            type="button"
            onClick={() => select(undefined)}
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
          >
            <RadioDot selected={!value} />
            <span className="text-sm text-muted-foreground">None</span>
          </button>
          {paymentModes.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              No payment modes added for this account yet — add one below.
            </p>
          ) : (
            paymentModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => select(mode.id)}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
              >
                <RadioDot selected={mode.id === value} />
                <span className="flex size-8 items-center justify-center rounded-lg bg-secondary">
                  <PaymentModeIcon kind={mode.kind} className="size-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm">{mode.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {KIND_LABELS[mode.kind]}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        {accountId ? (
          <div className="flex flex-col gap-2 border-t border-border px-4 py-4">
            <p className="text-xs text-muted-foreground">Add payment mode</p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="e.g. Google Pay UPI"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-11 flex-1"
              />
              <Select value={newKind} onValueChange={(v) => setNewKind(v as PaymentModeKind)}>
                <SelectTrigger className="w-36 data-[size=default]:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                className="size-11"
                onClick={handleCreate}
                disabled={isCreating || !newName.trim()}
                aria-label="Create payment mode"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
