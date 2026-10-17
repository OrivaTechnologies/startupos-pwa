import { TransactionFormSkeleton } from "@/components/transaction-form/transaction-form-skeleton";

export default function EditTransactionLoading() {
  return (
    <div className="flex h-svh flex-col">
      <TransactionFormSkeleton />
    </div>
  );
}
