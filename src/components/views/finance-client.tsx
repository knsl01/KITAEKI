"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TransactionAmount } from "@/components/transaction-amount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { sumTotals } from "@/lib/analytics";
import { formatCurrency, formatDate, percent } from "@/lib/format";
import { ACCOUNT_TYPE_LABEL, OWNER_LABEL, type Account, type Category, type MemberOwner, type RecurringTransaction, type Transaction } from "@/lib/types";

type Props = {
  start: string;
  end: string;
  accounts: Account[];
  transactions: Pick<Transaction, "type" | "amount" | "owner" | "occurred_on" | "category_id">[];
  upcoming: Pick<RecurringTransaction, "id" | "description" | "amount" | "type" | "next_run_on" | "owner">[];
  categories: Pick<Category, "id" | "name" | "color" | "kind">[];
};

export function FinanceClient({ start, end, accounts, transactions, upcoming, categories }: Props) {
  const router = useRouter();

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totals = sumTotals(transactions);
  const owners: MemberOwner[] = ["eki", "dinda", "shared"];

  // Monthly income vs expense chart
  const monthlyData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      const month = t.occurred_on.slice(0, 7); // yyyy-mm
      if (!map.has(month)) map.set(month, { income: 0, expense: 0 });
      const current = map.get(month)!;
      if (t.type === "income") current.income += Number(t.amount);
      if (t.type === "expense") current.expense += Number(t.amount);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        label: month,
        ...data,
      }));
  }, [transactions]);

  // Category donut chart (expenses)
  const categoryData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense" && t.category_id);
    const map = new Map<string, number>();
    for (const t of expenses) {
      if (t.category_id) {
        map.set(t.category_id, (map.get(t.category_id) ?? 0) + Number(t.amount));
      }
    }
    
    return Array.from(map.entries())
      .map(([id, value]) => {
        const cat = categories.find((c) => c.id === id);
        return {
          name: cat?.name ?? "Lainnya",
          value,
          color: cat?.color ?? "#B0B0B0",
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  function handleDateChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const s = formData.get("start") as string;
    const e_ = formData.get("end") as string;
    if (s && e_) {
      router.push(`/dashboard/finance?start=${s}&end=${e_}`);
    } else {
      router.push("/dashboard/finance");
    }
  }

  return (
    <div>
      <PageHeader
        title="Keuangan & Laporan"
        description="Posisi saldo, arus kas, dan laporan keuangan."
      />

      <form onSubmit={handleDateChange} className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="start" className="text-xs text-muted-foreground">Dari Tanggal</label>
          <input 
            type="date" 
            id="start"
            name="start"
            defaultValue={start}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="end" className="text-xs text-muted-foreground">Sampai Tanggal</label>
          <input 
            type="date" 
            id="end"
            name="end" 
            defaultValue={end}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <button type="submit" className="h-9 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
          Terapkan
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Total saldo</p>
          <p className="tabular mt-2 text-2xl font-bold">{formatCurrency(totalBalance)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pemasukan</p>
          <p className="tabular mt-2 text-2xl font-bold text-[hsl(var(--positive))]">
            {formatCurrency(totals.income)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pengeluaran</p>
          <p className="tabular mt-2 text-2xl font-bold text-[hsl(var(--negative))]">
            {formatCurrency(totals.expense)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Tabungan bersih</p>
          <p className="tabular mt-2 text-2xl font-bold">{formatCurrency(totals.net)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Arus Kas Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <IncomeExpenseChart data={monthlyData} />
            ) : (
              <EmptyState title="Tidak ada data" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pengeluaran Berdasarkan Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <CategoryDonut data={categoryData} />
            ) : (
              <EmptyState title="Tidak ada data" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sebaran saldo</CardTitle>
            <Link href="/dashboard/accounts" className="text-xs text-muted-foreground hover:text-foreground">
              Kelola akun
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {accounts.length === 0 ? (
              <EmptyState title="Belum ada akun aktif" />
            ) : (
              accounts.map((account) => (
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
                  const ownerTotals = sumTotals(transactions.filter((t) => t.owner === owner));
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
