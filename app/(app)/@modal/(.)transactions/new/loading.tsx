import { TransactionFormSkeleton } from "@/components/transaction-form/transaction-form-skeleton";
import { TransactionModalShell } from "@/components/transaction-form/transaction-modal-shell";

export default function NewTransactionModalLoading() {
  return (
    <TransactionModalShell>
      <TransactionFormSkeleton />
    </TransactionModalShell>
  );
}
