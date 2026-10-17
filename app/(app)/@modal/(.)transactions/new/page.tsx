import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getTransactionFormData } from "@/lib/queries";
import { TransactionFormRoute } from "@/components/transaction-form/transaction-form-route";
import { TransactionModalShell } from "@/components/transaction-form/transaction-modal-shell";

export default async function NewTransactionModal() {
  const supabase = await createClient();
  const [, { categories, projects, accounts, tagNames, defaultAccountId }] = await Promise.all([
    requireTool(supabase, "ledger"),
    getTransactionFormData(supabase),
  ]);

  return (
    <TransactionModalShell>
      <TransactionFormRoute
        mode="modal"
        categories={categories}
        projects={projects}
        accounts={accounts}
        existingTags={tagNames}
        defaultAccountId={defaultAccountId}
      />
    </TransactionModalShell>
  );
}
