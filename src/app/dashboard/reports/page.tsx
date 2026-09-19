import { BalanceTrendChart } from "@/components/charts/balance-trend-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { groupByCategory, groupByMonth, sumTotals } from "@/lib/analytics";
import { formatCurrency, lastMonths, monthLabel, monthRange } from "@/lib/format";
import { OWNER_LABEL, type Category, type MemberOwner, type Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Laporan — KITA" };

export default async function ReportsPage() {
  const supabase = await createClient();

  const months = lastMonths(12);
  const start = monthRange(months[0]).start;

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, occurred_on, category_id, owner")
      .gte("occurred_on", start),
    supabase.from("categories").select("id, name, color, kind"),
  ]);

  const txs = (transactions ?? []) as Pick<
    Transaction,
    "type" | "amount" | "occurred_on" | "category_id" | "owner"
  >[];
  const categoryList = (categories ?? []) as Pick<Category, "id" | "name" | "color" | "kind">[];

  const monthly = groupByMonth(txs, months);
  const chartData = monthly.map((m) => ({
    label: monthLabel(m.month).split(" ")[0].slice(0, 3),
    income: m.income,
    expense: m.expense,
  }));
  const netData = monthly.map((m) => ({
    label: monthLabel(m.month).split(" ")[0].slice(0, 3),
    net: m.income - m.expense,
  }));

  const totals = sumTotals(txs);
  const expenseByCategory = groupByCategory(txs, categoryList, "expense").slice(0, 8);
  const incomeByCategory = groupByCategory(txs, categoryList, "income").slice(0, 8);

  const owners: MemberOwner[] = ["eki", "dinda", "shared"];
  const byOwner = owners.map((owner) => ({
    owner,
    ...sumTotals(txs.filter((t) => t.owner === owner)),
  }));

  const empty = txs.length === 0;

  return (
    <div>
      <PageHeader title="Laporan" description="Ringkasan arus kas 12 bulan terakhir." />

      {empty ? (
        <Card>
          <EmptyState
            title="Belum ada data untuk dilaporkan"
            description="Catat beberapa transaksi dulu, laporannya akan muncul di sini."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Total pemasukan</p>
              <p className="tabular mt-2 text-2xl font-bold text-[hsl(var(--positive))]">
                {formatCurrency(totals.income)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Total pengeluaran</p>
              <p className="tabular mt-2 text-2xl font-bold text-[hsl(var(--negative))]">
                {formatCurrency(totals.expense)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Selisih</p>
              <p className="tabular mt-2 text-2xl font-bold">{formatCurrency(totals.net)}</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pemasukan vs pengeluaran</CardTitle>
              <span className="text-xs text-muted-foreground">12 bulan terakhir</span>
            </CardHeader>
            <CardContent className="pt-4">
              <IncomeExpenseChart data={chartData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selisih bulanan</CardTitle>
              <span className="text-xs text-muted-foreground">Pemasukan dikurangi pengeluaran</span>
            </CardHeader>
            <CardContent className="pt-4">
              <BalanceTrendChart data={netData} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pengeluaran per kategori</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {expenseByCategory.length === 0 ? (
                  <EmptyState title="Belum ada pengeluaran" />
                ) : (
                  <CategoryDonut data={expenseByCategory} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pemasukan per kategori</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {incomeByCategory.length === 0 ? (
                  <EmptyState title="Belum ada pemasukan" />
                ) : (
                  <CategoryDonut data={incomeByCategory} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rincian per bulan</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead className="text-right">Pemasukan</TableHead>
                    <TableHead className="text-right">Pengeluaran</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...monthly].reverse().map((m) => (
                    <TableRow key={m.month}>
                      <TableCell>{monthLabel(m.month)}</TableCell>
                      <TableCell className="tabular text-right text-[hsl(var(--positive))]">
                        {formatCurrency(m.income)}
                      </TableCell>
                      <TableCell className="tabular text-right text-[hsl(var(--negative))]">
                        {formatCurrency(m.expense)}
                      </TableCell>
                      <TableCell className="tabular text-right">{formatCurrency(m.income - m.expense)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rincian per orang</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Milik</TableHead>
                    <TableHead className="text-right">Pemasukan</TableHead>
                    <TableHead className="text-right">Pengeluaran</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byOwner.map((row) => (
                    <TableRow key={row.owner}>
                      <TableCell>{OWNER_LABEL[row.owner]}</TableCell>
                      <TableCell className="tabular text-right">{formatCurrency(row.income)}</TableCell>
                      <TableCell className="tabular text-right">{formatCurrency(row.expense)}</TableCell>
                      <TableCell className="tabular text-right">{formatCurrency(row.net)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
