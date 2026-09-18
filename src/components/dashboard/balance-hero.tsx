import { BalanceHeroCard } from "@/components/dashboard/balance-hero-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addDays,
  buildBalanceHistory,
  changeSince,
  endOfPreviousMonth,
  HISTORY_DAYS,
  isoDateInZone,
  type BalanceTx,
} from "@/lib/balance-history";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

/**
 * Query dashboard yang sudah ada hanya mengambil 6 bulan dan tidak memuat kolom akun,
 * jadi riwayat saldo 1 tahun butuh satu query baca-saja sendiri. RLS household tetap
 * berlaku. Dipaginasi karena PostgREST membatasi 1000 baris per permintaan.
 */
async function fetchTransactionsSince(since: string): Promise<BalanceTx[] | null> {
  const supabase = await createClient();
  const rows: BalanceTx[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("transactions")
      .select("type, amount, occurred_on, account_id, to_account_id")
      .gte("occurred_on", since)
      .order("occurred_on", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("[balance-hero] gagal membaca transaksi:", error.message);
      return null;
    }

    rows.push(...((data ?? []) as BalanceTx[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }

  // Terlalu banyak baris: lebih baik tanpa grafik daripada grafik yang salah.
  console.warn("[balance-hero] transaksi melebihi batas, riwayat saldo dilewati");
  return null;
}

/**
 * Semua angka di kartu ini datang dari dashboard (saldo, pemasukan, pengeluaran, akun).
 * Yang dihitung di sini hanya riwayat saldo, dari saldo akun + transaksi.
 */
export async function BalanceHero({
  accounts,
  total,
  income,
  expense,
  viewLabel,
}: {
  accounts: Account[];
  total: number;
  income: number;
  expense: number;
  viewLabel: string;
}) {
  const today = isoDateInZone(new Date());

  const transactions = accounts.length > 0 ? await fetchTransactionsSince(addDays(today, -HISTORY_DAYS)) : [];
  const history = transactions
    ? buildBalanceHistory({
        accounts: accounts.map((a) => ({ id: a.id, balance: a.balance, created_at: a.created_at })),
        transactions,
        today,
      })
    : [];

  return (
    <BalanceHeroCard
      total={total}
      history={history}
      monthChange={changeSince(history, endOfPreviousMonth(today))}
      income={income}
      expense={expense}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name, icon_key: a.icon_key }))}
      viewLabel={viewLabel}
    />
  );
}

export function BalanceHeroSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="space-y-6 px-5 pt-5 sm:px-8 sm:pt-7">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-44 rounded-full" />
        </div>
        <Skeleton className="h-14 w-72 max-w-full" />
        <div className="grid grid-cols-2 gap-3 lg:max-w-[23rem]">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
      <Skeleton className="mt-6 h-[150px] rounded-none sm:h-[180px] lg:h-[200px]" />
    </div>
  );
}
