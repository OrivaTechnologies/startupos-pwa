"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountTypeIcon } from "@/lib/categories";
import { cn, formatCurrency } from "@/lib/utils";
import { createAccount } from "@/app/(app)/accounts/actions";
import type { AccountType, Database } from "@/lib/supabase/types";

export type AccountWithModes = Database["public"]["Tables"]["accounts"]["Row"] & {
  balance: number;
  paymentModes: Database["public"]["Tables"]["payment_modes"]["Row"][];
};

const TYPE_LABELS: Record<AccountType, string> = {
  bank_account: "Bank accounts",
  wallet: "Wallets",
  credit_card: "Credit cards",
};

const TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "bank_account", label: "Bank Account" },
  { value: "wallet", label: "Wallet" },
  { value: "credit_card", label: "Credit Card" },
];

const TYPE_ORDER: AccountType[] = ["bank_account", "wallet", "credit_card"];

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

export function AccountPickerSheet({
  label,
  accounts,
  value,
  onChange,
  onCreated,
  excludeId,
}: {
  label: string;
  accounts: AccountWithModes[];
  value?: string;
  onChange: (accountId: string) => void;
  onCreated: (account: AccountWithModes) => void;
  excludeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AccountType>("bank_account");
  const [isCreating, startCreating] = useTransition();
  const selected = accounts.find((a) => a.id === value);

  const groups = useMemo(() => {
    return TYPE_ORDER.map((type) => ({
      type,
      accounts: accounts.filter((a) => a.account_type === type && a.id !== excludeId),
    })).filter((g) => g.accounts.length > 0);
  }, [accounts, excludeId]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    startCreating(async () => {
      const result = await createAccount(name, newType, 0);
      if (result.error || !result.id) {
        toast.error(result.error ?? "Could not create account");
        return;
      }
      const account: AccountWithModes = {
        id: result.id,
        name,
        account_type: newType,
        opening_balance: 0,
        is_default: false,
        is_archived: false,
        sort_order: 0,
        created_by: null,
        created_at: new Date().toISOString(),
        balance: 0,
        paymentModes: [],
      };
      onCreated(account);
      onChange(account.id);
      setNewName("");
      setNewType("bank_account");
      setOpen(false);
    });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button type="button" className="flex w-full items-center gap-3 py-2 text-left">
          <AccountTypeIcon accountType={selected?.account_type ?? "bank_account"} className="size-4 shrink-0" />
          <span className="flex-1 text-sm font-medium">{selected?.name ?? label}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between space-y-0">
          <DrawerTitle>Select Account</DrawerTitle>
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

        {groups.length > 0 ? (
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="text-sm text-muted-foreground">Show balance</span>
            <Switch checked={showBalance} onCheckedChange={setShowBalance} />
          </div>
        ) : null}

        <div className="flex max-h-[45vh] flex-col gap-4 overflow-y-auto px-4 pb-2">
          {groups.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No accounts yet — add one below to get started.
            </p>
          ) : (
            groups.map(({ type, accounts: group }) => (
              <div key={type} className="flex flex-col gap-1">
                <p className="px-1 text-xs text-muted-foreground">{TYPE_LABELS[type]}</p>
                {group.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => select(account.id)}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-secondary"
                  >
                    <RadioDot selected={account.id === value} />
                    <AccountTypeIcon accountType={account.account_type} className="size-4" />
                    <span className="flex-1 text-sm">{account.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {showBalance ? formatCurrency(account.balance) : "•••••"}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-4 py-4">
          <p className="text-xs text-muted-foreground">Add account</p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Account name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-11 flex-1"
            />
            <Select value={newType} onValueChange={(v) => setNewType(v as AccountType)}>
              <SelectTrigger className="w-36 data-[size=default]:h-11">
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
            <Button
              size="icon"
              className="size-11"
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
              aria-label="Create account"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
