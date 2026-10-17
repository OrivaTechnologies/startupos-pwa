import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeftRight } from "lucide-react";
import { CategoryIcon } from "@/lib/categories";
import { formatCurrency, cn } from "@/lib/utils";
import { toIST } from "@/lib/datetime";
import type { TransactionListItem } from "@/lib/queries";

const AMOUNT_COLOR: Record<TransactionListItem["transaction_type"], string> = {
  expense: "text-expense",
  income: "text-income",
  transfer: "text-foreground",
};

const AMOUNT_PREFIX: Record<TransactionListItem["transaction_type"], string> = {
  expense: "-",
  income: "+",
  transfer: "",
};

export function TransactionRow({ transaction }: { transaction: TransactionListItem }) {
  const fallbackTitle =
    transaction.transaction_type === "transfer"
      ? "Transfer"
      : transaction.categoryName ?? "Others";
  const title = transaction.notes?.trim() || fallbackTitle;

  const subtitle =
    transaction.transaction_type === "transfer"
      ? `${transaction.accountName} → ${transaction.destinationAccountName ?? "—"}`
      : transaction.projectName
        ? `${transaction.projectName} · ${transaction.accountName}`
        : transaction.accountName;

  return (
    <Link
      href={`/transactions/${transaction.id}/edit`}
      className="flex items-center gap-3 px-4 py-3"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        {transaction.transaction_type === "transfer" ? (
          <ArrowLeftRight className="size-4" />
        ) : (
          <CategoryIcon icon={transaction.categoryIcon ?? "ellipsis"} className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col items-end">
        <p className={cn("text-sm font-medium", AMOUNT_COLOR[transaction.transaction_type])}>
          {AMOUNT_PREFIX[transaction.transaction_type]}
          {formatCurrency(transaction.amount, transaction.currency)}
        </p>
        <p className="text-xs text-muted-foreground">{format(toIST(transaction.date_time), "d MMM")}</p>
      </div>
    </Link>
  );
}
