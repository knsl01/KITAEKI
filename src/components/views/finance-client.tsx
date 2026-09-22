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
import { MemberExpenseChart } from "@/components/charts/member-expense-chart";
import { MemberCashflowCompareChart } from "@/components/charts/member-cashflow-compare-chart";
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

  const chartData = useMemo(() => {
    const sDate = new Date(start);
    const eDate = new Date(end);
    const diffDays = Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24));
    const isDaily = diffDays <= 31;

    const map = new Map<string, { income: number; expense: number }>();
    
    // Fill all dates/months in range to prevent straight lines skipping days
    const curr = new Date(start);
    const endObj = new Date(end);
    
    while (curr <= endObj) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, "0");
      const d = String(curr.getDate()).padStart(2, "0");
      
      if (isDaily) {
        map.set(`${y}-${m}-${d}`, { income: 0, expense: 0 });
        curr.setDate(curr.getDate() + 1);
      } else {
        const monthStr = `${y}-${m}`;
        if (!map.has(monthStr)) map.set(monthStr, { income: 0, expense: 0 });
        curr.setMonth(curr.getMonth() + 1);
      }
    }
    
    for (const t of transactions) {
      const key = isDaily ? t.occurred_on : t.occurred_on.slice(0, 7);
      if (!map.has(key)) map.set(key, { income: 0, expense: 0 });
      const current = map.get(key)!;
      if (t.type === "income") current.income += Number(t.amount);
      if (t.type === "expense") current.expense += Number(t.amount);
    }
    
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => ({
        label: isDaily ? formatDate(key) : key,
        ...data,
      }));
  }, [transactions, start, end]);

  const exportRows = transactions.map((t) => ({
    date: t.occurred_on,
    type: t.type === "income" ? "Pemasukan" : t.type === "expense" ? "Pengeluaran" : "Transfer",
    amount: Number(t.amount),
    owner: OWNER_LABEL[t.owner],
    category: categories.find((c) => c.id === t.category_id)?.name ?? "Lainnya",
  }));

  function download(content: string, name: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportToSheets() {
    const esc = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      ["REKAP KEUANGAN KITA", "", "", "", ""],
      [`Periode ${start} sampai ${end}`, "", "", "", ""],
      [],
      ["Tanggal", "Jenis", "Nominal (Rp)", "Milik", "Kategori"],
      ...exportRows.map((row) => [row.date, row.type, row.amount, row.owner, row.category]),
    ].map((row) => row.map((cell) => esc(cell ?? "")).join(",")).join("\r\n");
    download("\ufeff" + csv, `Rekap_KITA_${start}_${end}_Google_Sheets.csv`, "text/csv;charset=utf-8");
  }

  function exportToExcel() {
    const esc = (value: string | number) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
    const body = exportRows.map((row) => `<tr><td>${esc(row.date)}</td><td>${esc(row.type)}</td><td class="num">${row.amount}</td><td>${esc(row.owner)}</td><td>${esc(row.category)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;color:#202124}h1{color:#49327a}table{border-collapse:collapse;min-width:760px}th{background:#49327a;color:#fff;padding:10px;text-align:left}td{border:1px solid #d9d4e8;padding:8px}.num{text-align:right;mso-number-format:"#,##0"}tr:nth-child(even){background:#f7f4fc}.meta{color:#666;margin-bottom:16px}</style></head><body><h1>Rekap Keuangan KITA</h1><p class="meta">Periode ${esc(start)} sampai ${esc(end)} · Dibuat ${esc(new Date().toLocaleDateString("id-ID"))}</p><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nominal (Rp)</th><th>Milik</th><th>Kategori</th></tr></thead><tbody>${body}</tbody></table></body></html>`;
    download(html, `Rekap_KITA_${start}_${end}.xls`, "application/vnd.ms-excel;charset=utf-8");
  }

  function exportToPdf() {
    document.body.classList.add("print-finance-report");
    window.print();
    window.setTimeout(() => document.body.classList.remove("print-finance-report"), 500);
  }

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

  const memberExpenseData = useMemo(() => {
    return owners.map(owner => {
      const ownerTotals = sumTotals(transactions.filter((t) => t.owner === owner));
      return {
        name: OWNER_LABEL[owner],
        amount: ownerTotals.expense,
        fill: owner === "eki" ? "#3F5540" : owner === "dinda" ? "#C7A17A" : "#8A9A5B"
      };
    }).filter(d => d.amount > 0);
  }, [transactions, owners]);

  const memberCashflowData = useMemo(() => owners.map((owner) => {
    const ownerTotals = sumTotals(transactions.filter((t) => t.owner === owner));
    return { name: OWNER_LABEL[owner], income: ownerTotals.income, expense: ownerTotals.expense };
  }).filter((row) => row.income > 0 || row.expense > 0), [transactions, owners]);

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
        <select aria-label="Format unduhan laporan" defaultValue="" onChange={(event) => { const value = event.target.value; event.currentTarget.value = ""; if (value === "excel") exportToExcel(); if (value === "sheets") exportToSheets(); if (value === "pdf") exportToPdf(); }} className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm">
          <option value="">Unduh laporan…</option>
          <option value="excel">Excel (.xls) — template rapi</option>
          <option value="sheets">Google Sheets (.csv)</option>
          <option value="pdf">PDF — cetak / simpan PDF</option>
        </select>
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
            {chartData.length > 0 ? (
              <IncomeExpenseChart data={chartData} />
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
              {memberExpenseData.length > 0 ? (
                <div className="mb-4">
                  <MemberExpenseChart data={memberExpenseData} />
                </div>
              ) : null}
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
              <CardTitle>Perbandingan pemasukan & pengeluaran</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {memberCashflowData.length > 0 ? <MemberCashflowCompareChart data={memberCashflowData} /> : <EmptyState title="Tidak ada data" />}
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
