import { formatCurrency } from "@/lib/format";
import type { Nudge, NudgeData, NudgePriority } from "./types";

const PRIORITY_ORDER: Record<NudgePriority, number> = { attention: 0, "worth-knowing": 1, helpful: 2 };
const DAY_MS = 86_400_000;

function dayNumber(isoDate: string): number {
  const parsed = Date.parse(`${isoDate}T12:00:00Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / DAY_MS) : 0;
}

function daysFromToday(date: string, today: string): number {
  return dayNumber(date) - dayNumber(today);
}

function dateWindow(days: number, today: string): string {
  return new Date((dayNumber(today) - days) * DAY_MS + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function compactBand(value: number, width: number): number {
  return Math.round(value / width);
}

function percentChange(current: number, baseline: number): number {
  return Math.round(((current - baseline) / baseline) * 100);
}

export function generateNudges(data: NudgeData): Nudge[] {
  const nudges: Nudge[] = [];
  const categoryNames = new Map(data.categories.map((category) => [category.id, category.name]));
  const activeRecurring = data.recurring.filter((item) => item.is_active && item.type === "expense");
  const dueSoon = activeRecurring.filter((item) => {
    const days = daysFromToday(item.next_run_on, data.today);
    return days >= 0 && days <= 7;
  });

  if (dueSoon.length) {
    const dueIds = dueSoon.map((item) => `${item.id}@${item.next_run_on}`).sort();
    const total = dueSoon.reduce((sum, item) => sum + Number(item.amount), 0);
    const nearest = Math.min(...dueSoon.map((item) => daysFromToday(item.next_run_on, data.today)));
    nudges.push({
      id: `bills:due:${dueIds.join(",")}`,
      kind: "actionable",
      category: "bills",
      priority: nearest <= 3 ? "attention" : "worth-knowing",
      title: dueSoon.length === 1 ? "Pembayaran terjadwal mendekat" : `${dueSoon.length} pembayaran terjadwal minggu ini`,
      description: dueSoon.length === 1
        ? `${dueSoon[0].description || "Transaksi berulang"} dijadwalkan ${nearest === 0 ? "hari ini" : `dalam ${nearest} hari`}.`
        : `Pembayaran berikutnya dijadwalkan dalam 7 hari ke depan.`,
      metric: `Estimasi ${formatCurrency(total)}`,
      action: { label: "Lihat tagihan", href: "/dashboard/recurring" },
    });
  }

  const upcomingByAccount = new Map<string, number>();
  for (const payment of dueSoon) {
    if (payment.account_id) upcomingByAccount.set(payment.account_id, (upcomingByAccount.get(payment.account_id) ?? 0) + Number(payment.amount));
  }
  for (const account of data.accounts) {
    const upcoming = upcomingByAccount.get(account.id) ?? 0;
    if (upcoming > 0 && upcoming > Number(account.balance)) {
      nudges.push({
        id: `money:account-payment:${account.id}:${compactBand(upcoming, 100_000)}:${compactBand(Number(account.balance), 100_000)}`,
        kind: "warning",
        category: "money",
        priority: "attention",
        title: `Periksa saldo ${account.name}`,
        description: `Pembayaran terjadwal dari akun ini melebihi saldo yang tercatat saat ini.`,
        metric: `${formatCurrency(upcoming)} terjadwal · saldo ${formatCurrency(Number(account.balance))}`,
        action: { label: "Lihat tagihan", href: "/dashboard/recurring" },
      });
    }
  }

  const recentStart = dateWindow(6, data.today);
  const baselineStart = dateWindow(27, data.today);
  const baselineEnd = dateWindow(7, data.today);
  const currentByCategory = new Map<string, number>();
  const baselineByCategory = new Map<string, number>();
  for (const transaction of data.transactions) {
    if (transaction.type !== "expense" || !transaction.category_id) continue;
    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount)) continue;
    if (transaction.occurred_on >= recentStart && transaction.occurred_on <= data.today) {
      currentByCategory.set(transaction.category_id, (currentByCategory.get(transaction.category_id) ?? 0) + amount);
    } else if (transaction.occurred_on >= baselineStart && transaction.occurred_on <= baselineEnd) {
      baselineByCategory.set(transaction.category_id, (baselineByCategory.get(transaction.category_id) ?? 0) + amount);
    }
  }

  const spendingChanges = [...currentByCategory.entries()].flatMap(([categoryId, current]) => {
    const baseline = (baselineByCategory.get(categoryId) ?? 0) / 3;
    if (baseline < 50_000 || Math.abs(current - baseline) < 50_000) return [];
    const change = percentChange(current, baseline);
    if (Math.abs(change) < 30) return [];
    return [{ categoryId, current, baseline, change }];
  }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 2);

  for (const change of spendingChanges) {
    const rising = change.change > 0;
    const category = categoryNames.get(change.categoryId) ?? "Kategori";
    nudges.push({
      id: `money:spend:${change.categoryId}:${dateWindow(6, data.today)}:${compactBand(change.current, 50_000)}`,
      kind: rising ? "actionable" : "positive",
      category: "money",
      priority: rising && change.change >= 60 ? "attention" : "worth-knowing",
      title: `Pengeluaran ${category.toLowerCase()} ${rising ? "naik" : "turun"}`,
      description: `Tercatat ${formatCurrency(change.current)} dalam 7 hari, dibanding rata-rata mingguan ${formatCurrency(change.baseline)} selama 3 minggu sebelumnya.`,
      metric: `${rising ? "+" : ""}${change.change}%`,
      action: { label: "Lihat transaksi", href: "/dashboard/transactions" },
    });
  }

  const allocationsTotal = data.allocations.reduce((sum, allocation) => sum + Number(allocation.allocated_amount), 0);
  const available = data.accounts.reduce((sum, account) => sum + Number(account.balance), 0) - allocationsTotal;
  if (available >= 1_000_000) {
    nudges.push({
      id: `money:available:${compactBand(available, 250_000)}`,
      kind: "informational",
      category: "money",
      priority: "helpful",
      title: "Ada saldo tersedia",
      description: "Saldo akun aktif setelah dikurangi dana yang sudah dicadangkan di pos anggaran.",
      metric: formatCurrency(available),
      action: { label: "Lihat anggaran", href: "/dashboard/budget" },
    });
  }

  const uncategorized = data.transactions.filter((transaction) =>
    transaction.type === "expense" && !transaction.category_id && transaction.occurred_on >= dateWindow(29, data.today),
  );
  if (uncategorized.length) {
    nudges.push({
      id: `cleanup:uncategorized:${uncategorized.map((transaction) => transaction.id).sort().join(",")}`,
      kind: "actionable",
      category: "cleanup",
      priority: "helpful",
      title: "Ada pengeluaran tanpa kategori",
      description: `${uncategorized.length} transaksi 30 hari terakhir belum memiliki kategori.`,
      action: { label: "Tinjau transaksi", href: "/dashboard/transactions" },
    });
  }

  const dueGoals = data.goals.filter((goal) => {
    if (!goal.target_date || Number(goal.current_amount) >= Number(goal.target_amount)) return false;
    const days = daysFromToday(goal.target_date, data.today);
    return days >= 0 && days <= 30;
  });
  for (const goal of dueGoals) {
    const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));
    const days = daysFromToday(goal.target_date!, data.today);
    nudges.push({
      id: `targets:deadline:${goal.id}:${goal.target_date}:${compactBand(remaining, 50_000)}`,
      kind: "actionable",
      category: "targets",
      priority: days <= 7 ? "attention" : "worth-knowing",
      title: `Target ${goal.name} mendekati tanggalnya`,
      description: `Tanggal target ${goal.target_date} · tersisa ${days} hari.`,
      metric: `${formatCurrency(remaining)} lagi`,
      action: { label: "Lihat target", href: "/dashboard/savings" },
    });
  }

  const openShopping = data.shopping.filter((item) => !item.is_bought);
  const shoppingTotal = openShopping.reduce((sum, item) => sum + Number(item.estimated_price ?? 0), 0);
  if (openShopping.length >= 10 || (available > 0 && shoppingTotal >= available * 0.4 && shoppingTotal >= 250_000)) {
    nudges.push({
      id: `shopping:open:${openShopping.length}:${compactBand(shoppingTotal, 100_000)}`,
      kind: "informational",
      category: "shopping",
      priority: "helpful",
      title: "Daftar belanja cukup banyak",
      description: `${openShopping.length} barang belum dicentang${available > 0 ? ", dengan estimasi dibandingkan saldo tersedia" : ""}.`,
      metric: shoppingTotal > 0 ? formatCurrency(shoppingTotal) : undefined,
      action: { label: "Lihat belanja", href: "/dashboard/shopping" },
    });
  }

  const plannerDue = data.planner.filter((item) => {
    if (item.is_done || !item.due_on) return false;
    const days = daysFromToday(item.due_on, data.today);
    return days >= 0 && days <= 3;
  });
  if (plannerDue.length >= 2) {
    nudges.push({
      id: `planner:due:${plannerDue.map((item) => `${item.id}@${item.due_on}`).sort().join(",")}`,
      kind: "actionable",
      category: "targets",
      priority: "worth-knowing",
      title: `${plannerDue.length} agenda mendekat`,
      description: "Ada beberapa agenda atau tugas dengan tanggal dalam 3 hari ke depan.",
      action: { label: "Lihat planner", href: "/dashboard/calendar" },
    });
  }

  const duplicateGroups = new Map<string, typeof data.transactions>();
  for (const transaction of data.transactions) {
    if (transaction.type !== "expense" || !transaction.description?.trim()) continue;
    const key = `${transaction.occurred_on}:${Number(transaction.amount)}:${transaction.description.trim().toLocaleLowerCase("id-ID")}`;
    duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), transaction]);
  }
  const duplicateTransactions = [...duplicateGroups.values()].filter((group) => group.length > 1).flat();
  if (duplicateTransactions.length) {
    nudges.push({
      id: `cleanup:similar:${duplicateTransactions.map((transaction) => transaction.id).sort().join(",")}`,
      kind: "actionable",
      category: "cleanup",
      priority: "worth-knowing",
      title: "Periksa transaksi yang mirip",
      description: `${duplicateTransactions.length} transaksi memiliki tanggal, nominal, dan keterangan yang sama.`,
      action: { label: "Periksa transaksi", href: "/dashboard/transactions" },
    });
  }

  return nudges
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.title.localeCompare(b.title, "id"))
    .slice(0, 12);
}
