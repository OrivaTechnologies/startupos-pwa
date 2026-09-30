"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTool, getAccessContext, canMutate, PERMISSION_ERROR } from "@/lib/access";
import { TransactionFormSchema } from "@/lib/validations/transaction";
import { getTransactionsForRecords } from "@/lib/queries";
import { formatISTDate, formatISTTime, istDayStartUtc, istDayEndUtc } from "@/lib/datetime";

type ActionResult = { error?: string; id?: string };

function parseFormData(formData: FormData) {
  return TransactionFormSchema.safeParse({
    transaction_type: formData.get("transaction_type"),
    amount: formData.get("amount"),
    currency: formData.get("currency") ?? "INR",
    date_time: formData.get("date_time"),
    category_id: formData.get("category_id") || undefined,
    project_id: formData.get("project_id") || undefined,
    account_id: formData.get("account_id"),
    destination_account_id: formData.get("destination_account_id") || undefined,
    payment_mode_id: formData.get("payment_mode_id") || undefined,
    notes: formData.get("notes") || undefined,
    description: formData.get("description") || undefined,
    tags: JSON.parse(String(formData.get("tags") ?? "[]")),
  });
}

async function upsertTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rawNames: string[]
) {
  const names = Array.from(
    new Set(rawNames.map((n) => n.trim().toLowerCase()).filter(Boolean))
  );
  if (names.length === 0) return [];

  const { data: existing, error: selectError } = await supabase
    .from("tags")
    .select("*")
    .in("name", names);
  if (selectError) throw selectError;

  const existingNames = new Set((existing ?? []).map((t) => t.name));
  const missing = names.filter((n) => !existingNames.has(n));
  if (missing.length === 0) return existing ?? [];

  const { data: inserted, error: insertError } = await supabase
    .from("tags")
    .insert(missing.map((name) => ({ name })))
    .select();
  // Another request may have created the same tag concurrently — fall back
  // to re-selecting rather than failing the whole transaction save.
  if (insertError) {
    const { data: retried, error: retryError } = await supabase
      .from("tags")
      .select("*")
      .in("name", names);
    if (retryError) throw retryError;
    return retried ?? [];
  }

  return [...(existing ?? []), ...(inserted ?? [])];
}

async function uploadReceipts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  transactionId: string,
  userId: string,
  files: File[]
) {
  for (const file of files) {
    if (file.size === 0) continue;
    const path = `${transactionId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(path, file);
    if (uploadError) continue;
    const { error: insertError } = await supabase.from("receipts").insert({
      transaction_id: transactionId,
      storage_path: path,
      file_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
      uploaded_by: userId,
    });
    if (insertError) {
      // Row insert failed after the file already landed in storage — remove
      // it so we don't leave an orphaned object with no DB reference.
      console.error("Failed to record receipt after upload:", insertError);
      await supabase.storage.from("receipts").remove([path]);
    }
  }
}

function revalidateLedgerPaths(transactionId?: string) {
  revalidatePath("/home");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  if (transactionId) {
    revalidatePath(`/transactions/${transactionId}/edit`);
  }
}

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Not signed in" };

  const { tags, ...transactionInput } = parsed.data;

  const { data: transaction, error: insertError } = await supabase
    .from("transactions")
    .insert({ ...transactionInput, created_by: userId })
    .select("id")
    .single();

  if (insertError || !transaction) {
    return { error: insertError?.message ?? "Failed to save transaction" };
  }

  if (tags.length > 0) {
    const tagRows = await upsertTags(supabase, tags);
    await supabase
      .from("transaction_tags")
      .insert(tagRows.map((t) => ({ transaction_id: transaction.id, tag_id: t.id })));
  }

  const receiptFiles = formData.getAll("receipts").filter((f): f is File => f instanceof File);
  await uploadReceipts(supabase, transaction.id, userId, receiptFiles);

  revalidateLedgerPaths(transaction.id);
  return { id: transaction.id };
}

export async function updateTransaction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select("created_by")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!canMutate(access, existing?.created_by ?? null)) return { error: PERMISSION_ERROR };

  const { tags, ...transactionInput } = parsed.data;

  const { error: updateError } = await supabase
    .from("transactions")
    .update(transactionInput)
    .eq("id", id);
  if (updateError) return { error: updateError.message };

  await supabase.from("transaction_tags").delete().eq("transaction_id", id);
  if (tags.length > 0) {
    const tagRows = await upsertTags(supabase, tags);
    await supabase
      .from("transaction_tags")
      .insert(tagRows.map((t) => ({ transaction_id: id, tag_id: t.id })));
  }

  const receiptFiles = formData.getAll("receipts").filter((f): f is File => f instanceof File);
  await uploadReceipts(supabase, id, access.userId, receiptFiles);

  revalidateLedgerPaths(id);
  return { id };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select("created_by")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!canMutate(access, existing?.created_by ?? null)) return { error: PERMISSION_ERROR };

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateLedgerPaths();
  return {};
}

export async function markReconciled(id: string, reconciled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select("created_by")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!canMutate(access, existing?.created_by ?? null)) return { error: PERMISSION_ERROR };

  const { error } = await supabase
    .from("transactions")
    .update({ status: reconciled ? "reconciled" : "recorded" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateLedgerPaths();
  return {};
}

export async function deleteReceipt(receiptId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const access = await getAccessContext(supabase);
  if (!access) return { error: "Not signed in" };

  const { data: receipt, error: fetchError } = await supabase
    .from("receipts")
    .select("storage_path, transaction_id, transactions(created_by)")
    .eq("id", receiptId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!receipt) return { error: "Attachment not found" };

  const createdBy = (receipt as unknown as { transactions: { created_by: string } | null })
    .transactions?.created_by ?? null;
  if (!canMutate(access, createdBy)) return { error: PERMISSION_ERROR };

  const { error: deleteError } = await supabase.from("receipts").delete().eq("id", receiptId);
  if (deleteError) return { error: deleteError.message };

  await supabase.storage.from("receipts").remove([receipt.storage_path]);

  revalidatePath(`/transactions/${receipt.transaction_id}/edit`);
  return {};
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportTransactionsCsv(filters?: {
  type?: "expense" | "income" | "transfer";
  projectId?: string;
  from?: string;
  to?: string;
}): Promise<{ csv?: string; filename?: string; error?: string }> {
  const supabase = await createClient();
  await requireTool(supabase, "ledger");

  const transactions = await getTransactionsForRecords(supabase, {
    type: filters?.type,
    projectId: filters?.projectId,
    from: filters?.from ? istDayStartUtc(filters.from).toISOString() : undefined,
    to: filters?.to ? istDayEndUtc(filters.to).toISOString() : undefined,
  });

  const header = ["Date", "Time", "Note", "Amount", "Account", "Project"];
  const rows = transactions.map((t) => {
    const account =
      t.transaction_type === "transfer"
        ? `${t.accountName} -> ${t.destinationAccountName ?? "—"}`
        : t.accountName;
    return [
      formatISTDate(t.date_time),
      formatISTTime(t.date_time),
      t.notes ?? "",
      String(t.amount),
      account,
      t.projectName ?? "",
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join("\r\n");

  const rangeSuffix = filters?.from || filters?.to
    ? `_${filters?.from ?? "start"}_to_${filters?.to ?? "end"}`
    : "";
  const filename = `transactions${rangeSuffix}.csv`;

  return { csv, filename };
}

export async function createProject(name: string): Promise<{ id?: string; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Project name is required" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name: trimmed })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}
