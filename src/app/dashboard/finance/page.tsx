import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TransactionAmount } from "@/components/transaction-amount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { sumTotals } from "@/lib/analytics";
import { formatCurrency, formatDate, monthKey, monthLabel, monthRange, percent } from "@/lib/format";
import { ACCOUNT_TYPE_LABEL, OWNER_LABEL, type Account, type MemberOwner, type Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Keuangan — KITA" };

export default async function FinancePage() {
  const supabase = await createClient();
  const month = monthKey();
  const { start, end } = monthRange(month);

  const [{ data: accounts }, { data: transactions }, { data: upcoming }] = await Promise.all([
    supabase.from("accounts").select("*").eq("is_active", true).order("balance", { ascending: false }),
    supabase
      .from("transactions")
      .select("type, amount, owner, occurred_on")
      .gte("occurred_on", start)
      .lte("occurred_on", end),
    supabase
      .from("recurring_transactions")
      .select("id, description, amount, type, next_run_on")
      .eq("is_active", true)
      .order("next_run_on")
      .limit(6),
  ]);

  const accountList = (accounts ?? []) as Account[];
  const txs = (transactions ?? []) as Pick<Transaction, "type" | "amount" | "owner" | "occurred_on">[];

  const totalBalance = accountList.reduce((sum, a) => sum + Number(a.balance), 0);
  const totals = sumTotals(txs);
  const owners: MemberOwner[] = ["eki", "dinda", "shared"];

  return (
    <div>
      <PageHeader
        title="Keuangan"
        description={`Posisi saldo dan arus kas untuk ${monthLabel(month)}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Total saldo</p>
          <p className="tabular mt-2 text-2xl font-medium">{formatCurrency(totalBalance)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pemasukan</p>
          <p className="tabular mt-2 text-2xl font-medium text-[hsl(var(--positive))]">
            {formatCurrency(totals.income)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pengeluaran</p>
          <p className="tabular mt-2 text-2xl font-medium text-[hsl(var(--negative))]">
            {formatCurrency(totals.expense)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Tabungan bulan ini</p>
          <p className="tabular mt-2 text-2xl font-medium">{formatCurrency(totals.net)}</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sebaran saldo</CardTitle>
            <Link href="/dashboard/accounts" className="text-xs text-muted-foreground hover:text-foreground">
              Kelola akun
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {accountList.length === 0 ? (
              <EmptyState title="Belum ada akun aktif" />
            ) : (
              accountList.map((account) => (
                <div key={account.id} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">
                      {account.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {ACCOUNT_TYPE_LABEL[account.type]}
                      </span>
                    </span>
                    <span className="tabular">{formatCurrency(Number(account.balance))}</span>
                  </div>
                  <Progress value={percent(Number(account.balance), totalBalance)} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Arus kas per orang</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="divide-y divide-border">
                {owners.map((owner) => {
                  const ownerTotals = sumTotals(txs.filter((t) => t.owner === owner));
                  return (
                    <li key={owner} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <span>{OWNER_LABEL[owner]}</span>
                      <span className="tabular flex gap-4">
                        <span className="text-[hsl(var(--positive))]">+{formatCurrency(ownerTotals.income)}</span>
                        <span className="text-[hsl(var(--negative))]">−{formatCurrency(ownerTotals.expense)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tagihan mendatang</CardTitle>
              <Link href="/dashboard/recurring" className="text-xs text-muted-foreground hover:text-foreground">
                Kelola
              </Link>
            </CardHeader>
            <CardContent className="pt-2">
              {!upcoming || upcoming.length === 0 ? (
                <EmptyState
                  title="Belum ada tagihan rutin"
                  description="Tambahkan tagihan berulang supaya tidak terlewat."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{item.description || "Tagihan rutin"}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(item.next_run_on)}</p>
                      </div>
                      <TransactionAmount type={item.type} amount={Number(item.amount)} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
