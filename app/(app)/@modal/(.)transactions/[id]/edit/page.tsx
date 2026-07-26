import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import {
  getTransactionFormData,
  getTransactionWithTags,
  getCurrentProfile,
  getReceiptsForTransaction,
} from "@/lib/queries";
import { TransactionFormRoute } from "@/components/transaction-form/transaction-form-route";
import { TransactionModalShell } from "@/components/transaction-form/transaction-modal-shell";

export default async function EditTransactionModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  await requireTool(supabase, "ledger");
  const [formData, existing, profile, receipts] = await Promise.all([
    getTransactionFormData(supabase),
    getTransactionWithTags(supabase, id),
    getCurrentProfile(supabase),
    getReceiptsForTransaction(supabase, id),
  ]);

  if (!existing) notFound();

  console.log(`[EditTransactionModal] id=${id} receipts.length=${receipts.length}`, receipts);

  return (
    <TransactionModalShell>
      <TransactionFormRoute
        mode="modal"
        categories={formData.categories}
        projects={formData.projects}
        accounts={formData.accounts}
        existingTags={formData.tagNames}
        defaultAccountId={formData.defaultAccountId}
        transaction={existing.transaction}
        initialTags={existing.tags}
        initialReceipts={receipts}
        currentUserId={profile?.id}
        currentUserRole={profile?.role}
      />
    </TransactionModalShell>
  );
}
