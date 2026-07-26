"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { PaymentModeRow } from "@/components/accounts/payment-mode-row";
import { AddPaymentModeDialog } from "@/components/accounts/add-payment-mode-dialog";
import { createAccount, updateAccount, deleteAccount } from "@/app/(app)/accounts/actions";
import { canMutateRecord } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import type { AccountType, Database, UserRole } from "@/lib/supabase/types";

const TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "bank_account", label: "Bank Account" },
  { value: "wallet", label: "Wallet" },
  { value: "credit_card", label: "Credit Card" },
];

type Account = Database["public"]["Tables"]["accounts"]["Row"] & {
  balance?: number;
  paymentModes?: Database["public"]["Tables"]["payment_modes"]["Row"][];
};

// Mounted only while the drawer is open, so its useState always starts fresh
// from the current `account` prop — no effect-based reset needed.
function AccountFormFields({
  account,
  currentUserId,
  currentUserRole,
  onOpenChange,
}: {
  account?: Account;
  currentUserId?: string;
  currentUserRole?: UserRole;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [accountType, setAccountType] = useState<AccountType>(
    account?.account_type ?? "bank_account"
  );
  const [openingBalance, setOpeningBalance] = useState(String(account?.opening_balance ?? 0));
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canEdit = !account || canMutateRecord(currentUserRole, currentUserId, account.created_by);

  function handleSubmit() {
    startTransition(async () => {
      const result = account
        ? await updateAccount(account.id, name, accountType, Number(openingBalance) || 0)
        : await createAccount(name, accountType, Number(openingBalance) || 0);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  async function handleDeleteConfirm() {
    const result = await deleteAccount(account!.id);
    if (!result.error) {
      onOpenChange(false);
    }
    return result;
  }

  return (
    <>
      <DrawerHeader className="flex-row items-center justify-between space-y-0">
        <DrawerTitle>{account ? "Edit account" : "New account"}</DrawerTitle>
        <div className="flex items-center gap-2">
          {account && canEdit ? (
            <button
              type="button"
              aria-label="Delete account"
              onClick={() => setDeleteOpen(true)}
              className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
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

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="account-name">Name</Label>
          <Input
            id="account-name"
            placeholder="e.g. Bank Account"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Account type</Label>
          <Select
            value={accountType}
            onValueChange={(v) => setAccountType(v as AccountType)}
            disabled={!canEdit}
          >
            <SelectTrigger className="data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {account ? (
          <div className="flex flex-col gap-0.5">
            <Label className="text-muted-foreground">Current balance</Label>
            <p className="text-lg font-semibold tabular-nums">
              {formatCurrency(account.balance ?? 0)}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="opening-balance">Opening balance</Label>
          <Input
            id="opening-balance"
            type="number"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            disabled={!canEdit}
            className="h-11"
          />
        </div>

        {account ? (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Linked payment modes</p>
              <AddPaymentModeDialog accountId={account.id} />
            </div>
            {account.paymentModes && account.paymentModes.length > 0 ? (
              <div className="-mx-4 divide-y divide-border">
                {account.paymentModes.map((mode) => (
                  <PaymentModeRow
                    key={mode.id}
                    mode={mode}
                    accountId={account.id}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payment modes yet.</p>
            )}
          </>
        ) : null}
      </div>

      {canEdit ? (
        <DrawerFooter>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DrawerFooter>
      ) : null}

      {account ? (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete this account?"
          description={`"${account.name}" and its linked payment modes will be permanently removed. This can't be undone.`}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  currentUserId,
  currentUserRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  currentUserId?: string;
  currentUserRole?: UserRole;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {open ? (
          <AccountFormFields
            account={account}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
