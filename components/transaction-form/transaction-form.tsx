"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronLeft, Save, Loader2, Trash2, StickyNote, AlignLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { TypeTabs } from "@/components/transaction-form/type-tabs";
import { AmountInput } from "@/components/transaction-form/amount-input";
import { DateTimePicker } from "@/components/transaction-form/date-time-picker";
import { CategoryPickerSheet } from "@/components/transaction-form/category-picker-sheet";
import {
  AccountPickerSheet,
  type AccountWithModes,
} from "@/components/transaction-form/account-picker-sheet";
import { PaymentModePickerSheet } from "@/components/transaction-form/payment-mode-picker-sheet";
import { ProjectPickerSheet } from "@/components/transaction-form/project-picker-sheet";
import { TagInput } from "@/components/transaction-form/tag-input";
import { AttachmentUploader } from "@/components/transaction-form/attachment-uploader";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteReceipt,
} from "@/app/(app)/transactions/actions";
import { TransactionFormSchema } from "@/lib/validations/transaction";
import { canMutateRecord } from "@/lib/permissions";
import type { Database, TransactionType, UserRole } from "@/lib/supabase/types";
import type { ReceiptWithUrl } from "@/lib/queries";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function TransactionForm({
  categories,
  projects: initialProjects,
  accounts: initialAccounts,
  existingTags,
  defaultAccountId,
  transaction,
  initialTags = [],
  initialReceipts = [],
  currentUserId,
  currentUserRole,
  onClose,
  onSaved,
}: {
  categories: Category[];
  projects: Project[];
  accounts: AccountWithModes[];
  existingTags: string[];
  defaultAccountId?: string;
  transaction?: Transaction;
  initialTags?: string[];
  initialReceipts?: ReceiptWithUrl[];
  currentUserId?: string;
  currentUserRole?: UserRole;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [transactionType, setTransactionType] = useState<TransactionType>(
    transaction?.transaction_type ?? "expense"
  );
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [dateTime, setDateTime] = useState(transaction?.date_time ?? new Date().toISOString());
  const [categoryId, setCategoryId] = useState(
    transaction?.category_id ?? categories.find((c) => c.name === "Others")?.id
  );
  const [projectId, setProjectId] = useState(transaction?.project_id ?? undefined);
  const [accountId, setAccountId] = useState(transaction?.account_id ?? defaultAccountId);
  const [destinationAccountId, setDestinationAccountId] = useState(
    transaction?.destination_account_id ?? undefined
  );
  const [paymentModeId, setPaymentModeId] = useState(transaction?.payment_mode_id ?? undefined);
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [tags, setTags] = useState<string[]>(initialTags);
  const [receipts, setReceipts] = useState<File[]>([]);
  const [existingReceipts, setExistingReceipts] = useState(initialReceipts);
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Creating a new transaction is always allowed; editing an existing one is
  // limited to its creator (or an admin), mirroring the transactions_update /
  // transactions_delete RLS policies.
  const canEditExisting =
    !transaction || canMutateRecord(currentUserRole, currentUserId, transaction.created_by);
  const canDelete = !!transaction && canEditExisting;

  const paymentModesForAccount = accounts.find((a) => a.id === accountId)?.paymentModes ?? [];

  function handlePaymentModeCreated(mode: Database["public"]["Tables"]["payment_modes"]["Row"]) {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === mode.account_id ? { ...a, paymentModes: [...a.paymentModes, mode] } : a
      )
    );
  }

  function handleAccountChange(id: string) {
    setAccountId(id);
    setPaymentModeId(undefined);
  }

  function buildCandidate() {
    return {
      transaction_type: transactionType,
      amount,
      currency: transaction?.currency ?? "INR",
      date_time: dateTime,
      category_id: categoryId,
      project_id: projectId,
      account_id: accountId,
      destination_account_id: destinationAccountId,
      payment_mode_id: transactionType === "transfer" ? undefined : paymentModeId,
      notes: notes || undefined,
      description: description || undefined,
      tags,
    };
  }

  // Cheap synchronous check re-run every render — no need for useMemo.
  const isFormValid = TransactionFormSchema.safeParse(buildCandidate()).success;

  function handleSubmit() {
    const parsed = TransactionFormSchema.safeParse(buildCandidate());
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    const formData = new FormData();
    formData.set("transaction_type", parsed.data.transaction_type);
    formData.set("amount", String(parsed.data.amount));
    formData.set("currency", parsed.data.currency);
    formData.set("date_time", parsed.data.date_time);
    if (parsed.data.category_id) formData.set("category_id", parsed.data.category_id);
    if (parsed.data.project_id) formData.set("project_id", parsed.data.project_id);
    formData.set("account_id", parsed.data.account_id);
    if (parsed.data.destination_account_id) {
      formData.set("destination_account_id", parsed.data.destination_account_id);
    }
    if (parsed.data.payment_mode_id) formData.set("payment_mode_id", parsed.data.payment_mode_id);
    if (parsed.data.notes) formData.set("notes", parsed.data.notes);
    if (parsed.data.description) formData.set("description", parsed.data.description);
    formData.set("tags", JSON.stringify(parsed.data.tags));
    receipts.forEach((file) => formData.append("receipts", file));

    startTransition(async () => {
      const result = transaction
        ? await updateTransaction(transaction.id, formData)
        : await createTransaction(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(transaction ? "Transaction updated" : "Transaction added");
      onSaved();
    });
  }

  async function handleRemoveExistingReceipt(receiptId: string) {
    const previous = existingReceipts;
    setExistingReceipts((prev) => prev.filter((r) => r.id !== receiptId));
    const result = await deleteReceipt(receiptId);
    if (result.error) {
      toast.error(result.error);
      setExistingReceipts(previous);
    }
  }

  async function handleDeleteConfirm() {
    const result = await deleteTransaction(transaction!.id);
    if (!result.error) {
      toast.success("Transaction deleted");
      onClose();
    }
    return result;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-glass-border bg-glass px-4 py-3 backdrop-blur-xl dark:bg-card/50">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="flex-1 text-base font-semibold">
          {transaction ? "Edit transaction" : "Add transaction"}
        </h1>
        {canDelete ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete transaction"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4">
        <div className="shrink-0">
          <TypeTabs value={transactionType} onChange={setTransactionType} />
        </div>

        <Card className="shrink-0 gap-0 p-4">
          <div className="flex justify-center pb-3">
            <DateTimePicker value={dateTime} onChange={setDateTime} />
          </div>
          <div className="border-t border-border pt-1">
            <AmountInput value={amount} onChange={setAmount} />
          </div>
        </Card>

        <Card className="shrink-0 gap-0 p-0">
          <FieldRow label="Note">
            <div className="flex items-center gap-3">
              <StickyNote className="size-4 shrink-0 text-muted-foreground" />
              <Textarea
                placeholder="Add a note"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={1}
                className="min-h-0 flex-1 resize-none border-none bg-transparent px-0 py-2 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
          </FieldRow>

          {transactionType !== "transfer" ? (
            <FieldRow label="Category">
              <CategoryPickerSheet
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
              />
            </FieldRow>
          ) : null}

          <FieldRow label={transactionType === "transfer" ? "From account" : "Account"}>
            <AccountPickerSheet
              label={transactionType === "transfer" ? "From account" : "Account"}
              accounts={accounts}
              value={accountId}
              onChange={handleAccountChange}
              onCreated={(account) => setAccounts((prev) => [...prev, account])}
              excludeId={transactionType === "transfer" ? destinationAccountId : undefined}
            />
          </FieldRow>

          {transactionType === "transfer" ? (
            <FieldRow label="To account">
              <AccountPickerSheet
                label="To account"
                accounts={accounts}
                value={destinationAccountId}
                onChange={setDestinationAccountId}
                onCreated={(account) => setAccounts((prev) => [...prev, account])}
                excludeId={accountId}
              />
            </FieldRow>
          ) : (
            <FieldRow label="Payment mode">
              <PaymentModePickerSheet
                accountId={accountId}
                paymentModes={paymentModesForAccount}
                value={paymentModeId}
                onChange={setPaymentModeId}
                onCreated={handlePaymentModeCreated}
                disabled={!accountId}
              />
            </FieldRow>
          )}

          <FieldRow label="Project">
            <ProjectPickerSheet
              projects={projects}
              value={projectId}
              onChange={setProjectId}
              onCreated={(project) => setProjects((prev) => [...prev, project])}
            />
          </FieldRow>
        </Card>

        <Card className="shrink-0 gap-0 p-0">
          <FieldRow label="Tags">
            <TagInput value={tags} onChange={setTags} suggestions={existingTags} />
          </FieldRow>

          <FieldRow label="Attachments">
            <AttachmentUploader
              value={receipts}
              onChange={setReceipts}
              existingReceipts={existingReceipts}
              onRemoveExisting={canEditExisting ? handleRemoveExistingReceipt : undefined}
            />
          </FieldRow>

          <FieldRow label="Description">
            <div className="flex items-start gap-3">
              <AlignLeft className="mt-2 size-4 shrink-0 text-muted-foreground" />
              <Textarea
                placeholder="Add a longer description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="min-h-16 flex-1 resize-none border-none bg-transparent px-0 py-2 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
          </FieldRow>
        </Card>
      </div>

      <div className="flex shrink-0 items-center justify-end border-t border-glass-border bg-glass px-4 py-3 backdrop-blur-xl dark:bg-card/50">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !isFormValid || !canEditExisting}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-black/20 transition-transform active:scale-95 disabled:opacity-40"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </button>
      </div>

      {canDelete ? (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete this transaction?"
          description="This can't be undone."
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </div>
  );
}
