import Link from "next/link";
import { ArrowUpRight, Plus, Wallet } from "lucide-react";
import { DashboardBanner, type BannerSettings } from "@/components/dashboard/banner";
import { BrandMarkTile, CategoryIconTile } from "@/components/brand-mark";
import { CategoryDonut } from "@/components/charts/category-donut";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { StatCard } from "@/components/stat-card";
import { TransactionAmount } from "@/components/transaction-amount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { groupByCategory, groupByMonth, sumTotals, trend } from "@/lib/analytics";
import { formatCurrency, formatDate, lastMonths, monthKey, monthLabel, monthRange, percent } from "@/lib/format";
import { ACCOUNT_TYPE_LABEL, OWNER_LABEL } from "@/lib/types";
import type { Account, Category, MemberOwner, SavingsGoal, Transaction } from "@/lib/types";
import type { ViewKey } from "@/components/member-switcher";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view: ViewKey = params.view === "eki" || params.view === "dinda" ? params.view : "bersama";

  const supabase = await createClient();
  const workspace = await getWorkspace();

  const months = lastMonths(6);
  const rangeStart = monthRange(months[0]).start;
  const thisMonth = monthKey();
  const prevMonth = months[months.length - 2];

  const [
    { data: accounts },
    { data: transactions },
    { data: categories },
    { data: goals },
    { data: recent },
    { data: settings },
  ] = await Promise.all([
    supabase.from("accounts").select("*").eq("is_active", true).order("balance", { ascending: false }),
    supabase
      .from("transactions")
      .select("id, type, amount, occurred_on, category_id, owner")
      .gte("occurred_on", rangeStart),
    supabase.from("categories").select("id, name, color, kind, icon_key"),
    supabase.from("savings_goals").select("*").eq("is_archived", false).order("created_at").limit(4),
    supabase
      .from("transactions")
      .select("id, type, amount, occurred_on, description, owner, category:categories(id, name, color, icon_key)")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("workspace_settings").select("*").maybeSingle(),
  ]);

  const accountList = ((accounts ?? []) as Account[]).filter(
    (a) => view === "bersama" || a.owner === view || a.owner === "shared"
  );
  const allTxs = (transactions ?? []) as Pick<
    Transaction,
    "id" | "type" | "amount" | "occurred_on" | "category_id" | "owner"
  >[];
  const txs = view === "bersama" ? allTxs : allTxs.filter((t) => t.owner === view);
  const categoryList = (categories ?? []) as Pick<Category, "id" | "name" | "color" | "kind" | "icon_key">[];
  const goalList = ((goals ?? []) as SavingsGoal[]).filter(
    (g) => view === "bersama" || g.owner === view || g.owner === "shared"
  );
  const recentList = (recent ?? []).filter((t) => view === "bersama" || t.owner === view).slice(0, 6);

  const totalBalance = accountList.reduce((sum, a) => sum + Number(a.balance), 0);
  const current = sumTotals(txs.filter((t) => t.occurred_on.startsWith(thisMonth)));
  const previous = sumTotals(txs.filter((t) => t.occurred_on.startsWith(prevMonth)));

  const monthly = groupByMonth(txs, months).map((m) => ({
    label: monthLabel(m.month).split(" ")[0].slice(0, 3),
    income: m.income,
    expense: m.expense,
  }));

  const spendingByCategory = groupByCategory(
    txs.filter((t) => t.occurred_on.startsWith(thisMonth)),
    categoryList,
    "expense"
  ).slice(0, 6);

  const banner: BannerSettings = {
    banner_image_url: (settings?.banner_image_url as string | null) ?? null,
    banner_title: (settings?.banner_title as string | undefined) ?? "Selamat datang",
    banner_subtitle:
      (settings?.banner_subtitle as string | undefined) ?? "Keuangan yang terencana, hidup yang lebih tenang.",
    banner_quote: (settings?.banner_quote as string | undefined) ?? "Sedikit demi sedikit, jadi besar.",
  };

  const memberName = (key: MemberOwner) =>
    workspace?.members.find((m) => m.member_key === key)?.full_name ||
    (key === "eki" ? "Eki" : "Dinda");

  const savingsRate = current.income > 0 ? percent(current.net, current.income) : 0;

  return (
    <div className="space-y-5">
      {workspace?.householdId ? (
        <DashboardBanner
          settings={banner}
          householdId={workspace.householdId}
          coupleName={view === "bersama" ? workspace.coupleName : memberName(view)}
          view={view}
          labels={{ eki: memberName("eki"), dinda: memberName("dinda") }}
          monthLabel={monthLabel(thisMonth)}
        />
      ) : null}

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total saldo" value={totalBalance} hint={`${accountList.length} akun aktif`} />
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
          hint={current.income > 0 ? `${savingsRate}% dari pemasukan` : "Pemasukan dikurangi pengeluaran"}
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
            <Link
              href="/dashboard/accounts"
              className="icon-slide flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Kelola <Plus className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-3">
            {accountList.length === 0 ? (
              <EmptyState
                title="Belum ada akun"
                description="Tambah rekening, e-wallet, atau uang tunai untuk mulai mencatat."
              />
            ) : (
              <ul className="space-y-1">
                {accountList.slice(0, 6).map((account) => (
                  <li key={account.id} className="group flex items-center gap-3 rounded-lg px-1 py-2">
                    <BrandMarkTile iconKey={account.icon_key} name={account.name} size="sm" className="group-hover:scale-105" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{account.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {ACCOUNT_TYPE_LABEL[account.type]} · {OWNER_LABEL[account.owner]}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-sm">{formatCurrency(Number(account.balance))}</span>
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
            className="icon-slide flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Lihat semua <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="pt-3">
          {recentList.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description="Gunakan tombol Tambah transaksi di kanan atas untuk mencatat yang pertama."
            />
          ) : (
            <ul className="space-y-1">
              {recentList.map((t) => {
                const category = Array.isArray(t.category) ? t.category[0] : t.category;
                return (
                  <li key={t.id} className="group flex items-center gap-3 rounded-lg px-1 py-2.5">
                    {category ? (
                      <CategoryIconTile
                        iconKey={category.icon_key}
                        name={category.name}
                        color={category.color}
                        size="sm"
                        className="group-hover:scale-105"
                      />
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
                        <Wallet className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{t.description || category?.name || "Tanpa catatan"}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {formatDate(t.occurred_on)} · {OWNER_LABEL[t.owner as MemberOwner]}
                      </p>
                    </div>
                    <TransactionAmount type={t.type} amount={Number(t.amount)} className="shrink-0 text-sm" />
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
