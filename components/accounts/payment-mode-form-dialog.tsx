"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPaymentMode, updatePaymentMode } from "@/app/(app)/accounts/actions";
import type { Database, PaymentModeKind } from "@/lib/supabase/types";

const KIND_OPTIONS: { value: PaymentModeKind; label: string }[] = [
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "internet_banking", label: "Internet Banking" },
  { value: "debit_card", label: "Debit Card" },
];

type PaymentMode = Database["public"]["Tables"]["payment_modes"]["Row"];

// Mounted only while the dialog is open, so its useState always starts fresh
// from the current `paymentMode` prop — no effect-based reset needed.
function PaymentModeFormFields({
  accountId,
  paymentMode,
  onOpenChange,
}: {
  accountId: string;
  paymentMode?: PaymentMode;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(paymentMode?.name ?? "");
  const [kind, setKind] = useState<PaymentModeKind>(paymentMode?.kind ?? "upi");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = paymentMode
        ? await updatePaymentMode(paymentMode.id, name, kind)
        : await createPaymentMode(accountId, name, kind);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{paymentMode ? "Edit payment mode" : "New payment mode"}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="payment-mode-name">Name</Label>
          <Input
            id="payment-mode-name"
            placeholder="e.g. Google Pay UPI"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as PaymentModeKind)}>
            <SelectTrigger className="data-[size=default]:h-11">
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
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function PaymentModeFormDialog({
  open,
  onOpenChange,
  accountId,
  paymentMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  paymentMode?: PaymentMode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <PaymentModeFormFields
            accountId={accountId}
            paymentMode={paymentMode}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
