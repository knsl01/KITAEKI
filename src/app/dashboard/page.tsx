import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CategoryDonut } from "@/components/charts/category-donut";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { StatCard } from "@/components/stat-card";
import { TransactionAmount } from "@/components/transaction-amount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { groupByCategory, groupByMonth, sumTotals, trend } from "@/lib/analytics";
import { formatCurrency, formatDate, lastMonths, monthKey, monthLabel, monthRange, percent } from "@/lib/format";
import { OWNER_LABEL } from "@/lib/types";
import type { Account, Category, SavingsGoal, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const months = lastMonths(6);
  const rangeStart = monthRange(months[0]).start;
  const thisMonth = monthKey();
  const prevMonth = months[months.length - 2];

  const [{ data: accounts }, { data: transactions }, { data: categories }, { data: goals }, { data: recent }] =
    await Promise.all([
      supabase.from("accounts").select("id, name, type, balance, is_active").order("name"),
      supabase.from("transactions").select("id, type, amount, occurred_on, category_id").gte("occurred_on", rangeStart),
      supabase.from("categories").select("id, name, color, kind"),
      supabase.from("savings_goals").select("*").eq("is_archived", false).order("created_at").limit(4),
      supabase
        .from("transactions")
        .select("id, type, amount, occurred_on, description, owner, category:categories(id, name, color)")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const accountList = (accounts ?? []) as Pick<Account, "id" | "name" | "type" | "balance" | "is_active">[];
  const txs = (transactions ?? []) as Pick<Transaction, "id" | "type" | "amount" | "occurred_on" | "category_id">[];
  const categoryList = (categories ?? []) as Pick<Category, "id" | "name" | "color" | "kind">[];
  const goalList = (goals ?? []) as SavingsGoal[];

  const totalBalance = accountList
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const thisMonthTxs = txs.filter((t) => t.occurred_on.startsWith(thisMonth));
  const prevMonthTxs = txs.filter((t) => t.occurred_on.startsWith(prevMonth));

  const current = sumTotals(thisMonthTxs);
  const previous = sumTotals(prevMonthTxs);

  const monthly = groupByMonth(txs, months).map((m) => ({
    label: monthLabel(m.month).split(" ")[0].slice(0, 3),
    income: m.income,
    expense: m.expense,
  }));

  const spendingByCategory = groupByCategory(thisMonthTxs, categoryList).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Selamat datang</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ringkasan keuangan kalian untuk {monthLabel(thisMonth)}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total saldo" value={totalBalance} hint={`${accountList.length} akun tercatat`} />
        <StatCard
          label="Pemasukan bulan ini"
          value={current.income}
          trend={trend(current.income, previous.income)}
          tone="positive"
        />
        <StatCard
          label="Pengeluaran bulan ini"
          value={current.expense}
          trend={trend(current.expense, previous.expense)}
          tone="negative"
        />
        <StatCard
          label="Tabungan bulan ini"
          value={current.net}
          hint="Pemasukan dikurangi pengeluaran"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pemasukan vs pengeluaran</CardTitle>
            <span className="text-xs text-muted-foreground">6 bulan terakhir</span>
          </CardHeader>
          <CardContent className="pt-4">
            <IncomeExpenseChart data={monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo per akun</CardTitle>
            <Link href="/dashboard/accounts" className="text-xs text-muted-foreground hover:text-foreground">
              Kelola
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {accountList.length === 0 ? (
              <EmptyState
                title="Belum ada akun"
                description="Tambah rekening, e-wallet, atau uang tunai untuk mulai mencatat."
              />
            ) : (
              <ul className="divide-y divide-border">
                {accountList.slice(0, 8).map((account) => (
                  <li key={account.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="truncate">{account.name}</span>
                    <span className="tabular text-muted-foreground">{formatCurrency(Number(account.balance))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pengeluaran per kategori</CardTitle>
            <span className="text-xs text-muted-foreground">{monthLabel(thisMonth)}</span>
          </CardHeader>
          <CardContent className="pt-4">
            {spendingByCategory.length === 0 ? (
              <EmptyState title="Belum ada pengeluaran bulan ini" description="Catat transaksi pertama kalian." />
            ) : (
              <CategoryDonut data={spendingByCategory} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Target tabungan</CardTitle>
            <Link href="/dashboard/savings" className="text-xs text-muted-foreground hover:text-foreground">
              Lihat semua
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {goalList.length === 0 ? (
              <EmptyState title="Belum ada target" description="Buat target pertama kalian di halaman Tabungan." />
            ) : (
              goalList.map((goal) => {
                const progress = percent(Number(goal.current_amount), Number(goal.target_amount));
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{goal.name}</span>
                      <span className="tabular text-xs text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    <p className="tabular text-xs text-muted-foreground">
                      {formatCurrency(Number(goal.current_amount))} dari {formatCurrency(Number(goal.target_amount))}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaksi terbaru</CardTitle>
          <Link
            href="/dashboard/transactions"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Lihat semua <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="pt-2">
          {!recent || recent.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description="Gunakan tombol Tambah transaksi di kanan atas untuk mencatat yang pertama."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((t) => {
                const category = Array.isArray(t.category) ? t.category[0] : t.category;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{t.description || category?.name || "Tanpa catatan"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(t.occurred_on)} · {OWNER_LABEL[t.owner as keyof typeof OWNER_LABEL]}
                      </p>
                    </div>
                    <TransactionAmount type={t.type} amount={Number(t.amount)} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
