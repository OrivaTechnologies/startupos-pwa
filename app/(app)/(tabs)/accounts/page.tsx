import { Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireTool } from "@/lib/access";
import { getAccountsWithPaymentModes, getDefaultAccount, getCurrentProfile } from "@/lib/queries";
import { AccountCard } from "@/components/accounts/account-card";
import { AddAccountDialog } from "@/components/accounts/add-account-dialog";
import { AccountTypeIcon } from "@/lib/categories";
import { Card } from "@/components/ui/card";

export default async function AccountsPage() {
  const supabase = await createClient();
  const [, accounts, defaultAccount, profile] = await Promise.all([
    requireTool(supabase, "ledger"),
    getAccountsWithPaymentModes(supabase),
    getDefaultAccount(supabase),
    getCurrentProfile(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Accounts</h1>
        <AddAccountDialog />
      </div>

      {defaultAccount ? (
        <Card className="gap-2 p-4">
          <p className="text-xs text-muted-foreground">Default account</p>
          <div className="flex items-center gap-2">
            <AccountTypeIcon accountType={defaultAccount.account_type} className="size-4" />
            <p className="text-base font-medium">{defaultAccount.name}</p>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {accounts.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Landmark className="size-5" />
            </div>
            <div>
              <p className="text-base font-medium">No accounts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a bank account, wallet, or credit card to start tracking
                your balances.
              </p>
            </div>
          </Card>
        ) : (
          <>
            <p className="text-xs uppercase text-muted-foreground">Accounts</p>
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                currentUserId={profile?.id}
                currentUserRole={profile?.role}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
