/**
 * Riwayat saldo, dibangun dari data yang sudah ada — tanpa tabel baru.
 *
 * Saldo akun di database selalu = saldo awal + efek semua transaksi (lihat trigger
 * `transactions_sync_balance`). Jadi saldo di hari mana pun bisa dihitung mundur dari
 * saldo sekarang: saldo(hari D) = saldo sekarang − efek semua transaksi setelah D.
 *
 * Aturannya sama persis dengan `apply_transaction_effect` di SQL:
 *   income   → akun asal  +amount
 *   expense  → akun asal  −amount
 *   transfer → akun asal  −amount, akun tujuan +amount
 *
 * File ini murni (tanpa React, tanpa Supabase) supaya gampang dites.
 */

export const APP_TIME_ZONE = "Asia/Jakarta";
export const HISTORY_DAYS = 365;

const DAY_MS = 86_400_000;

export type BalanceAccount = {
  id: string;
  balance: number | string;
  created_at: string;
};

export type BalanceTx = {
  type: "income" | "expense" | "transfer";
  amount: number | string;
  occurred_on: string;
  account_id: string | null;
  to_account_id: string | null;
};

export type BalancePoint = { date: string; value: number };

export type BalanceChange = {
  amount: number;
  /** Persen terhadap saldo awal periode. null kalau saldo awalnya 0 atau negatif. */
  percent: number | null;
};

/* ── tanggal ────────────────────────────────────────────── */

function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toISO(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  return toISO(parseISO(iso) + days * DAY_MS);
}

/** Tanggal (yyyy-mm-dd) di zona waktu aplikasi, bukan zona waktu server. */
export function isoDateInZone(value: Date | string, timeZone: string = APP_TIME_ZONE) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Hari terakhir bulan sebelumnya dari tanggal tertentu. */
export function endOfPreviousMonth(iso: string) {
  return addDays(`${iso.slice(0, 7)}-01`, -1);
}

/* ── inti ───────────────────────────────────────────────── */

/**
 * Saldo gabungan di akhir tiap hari selama `days` hari terakhir sampai `today`.
 *
 * - Titik terakhir selalu sama dengan jumlah saldo akun sekarang.
 * - Sebuah akun baru dihitung sejak tanggal ia mulai ada (tanggal dibuat, atau tanggal
 *   transaksi paling awal kalau ada yang dicatat mundur). Sebelum itu ia tidak
 *   menyumbang apa pun, jadi grafik tidak menampilkan saldo yang belum pernah ada.
 * - Grafik mulai dari hari pertama ada akun, bukan dari 365 hari lalu.
 */
export function buildBalanceHistory(input: {
  accounts: BalanceAccount[];
  transactions: BalanceTx[];
  today: string;
  days?: number;
}): BalancePoint[] {
  const { accounts, transactions, today } = input;
  const days = input.days ?? HISTORY_DAYS;
  if (accounts.length === 0) return [];

  const end = parseISO(today);
  const windowStart = end - days * DAY_MS;
  const indexOf = (iso: string) => Math.round((parseISO(iso) - windowStart) / DAY_MS);

  const ids = new Set(accounts.map((a) => a.id));
  const deltas = new Map<string, number[]>(accounts.map((a) => [a.id, new Array<number>(days + 1).fill(0)]));
  const firstTxIndex = new Map<string, number>();

  const touch = (accountId: string | null, idx: number, amount: number) => {
    if (!accountId || !ids.has(accountId)) return;
    // Transaksi bertanggal masa depan sudah ikut di saldo sekarang, jadi
    // dilepas bersama transaksi hari ini saat melangkah mundur dari hari ini.
    deltas.get(accountId)![Math.min(idx, days)] += amount;
    const seen = firstTxIndex.get(accountId);
    if (seen === undefined || idx < seen) firstTxIndex.set(accountId, idx);
  };

  for (const tx of transactions) {
    const idx = indexOf(tx.occurred_on);
    if (idx < 0) continue; // sebelum jendela: sudah termasuk di saldo semua titik
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount)) continue;

    if (tx.type === "income") touch(tx.account_id, idx, amount);
    else if (tx.type === "expense") touch(tx.account_id, idx, -amount);
    else if (tx.type === "transfer") {
      touch(tx.account_id, idx, -amount);
      touch(tx.to_account_id, idx, amount);
    }
  }

  const startIndex = accounts.map((a) => {
    const created = indexOf(isoDateInZone(a.created_at));
    const firstTx = firstTxIndex.get(a.id);
    const start = firstTx === undefined ? created : Math.min(created, firstTx);
    return Math.min(days, Math.max(0, start));
  });

  const running = accounts.map((a) => Number(a.balance) || 0);
  const totals = new Array<number>(days + 1).fill(0);

  for (let i = days; i >= 0; i--) {
    let sum = 0;
    for (let a = 0; a < accounts.length; a++) {
      if (i >= startIndex[a]) sum += running[a];
    }
    totals[i] = Math.round(sum * 100) / 100;

    for (let a = 0; a < accounts.length; a++) {
      running[a] -= deltas.get(accounts[a].id)![i];
    }
  }

  const first = Math.min(...startIndex);
  const points: BalancePoint[] = [];
  for (let i = first; i <= days; i++) {
    points.push({ date: toISO(windowStart + i * DAY_MS), value: totals[i] });
  }
  return points;
}

/** Selisih antara titik terakhir dan saldo di akhir `baselineDate` (atau titik pertama kalau riwayat lebih pendek). */
export function changeSince(points: BalancePoint[], baselineDate: string): BalanceChange | null {
  if (points.length === 0) return null;
  const last = points[points.length - 1];

  let base = points[0];
  for (const p of points) {
    if (p.date <= baselineDate) base = p;
    else break;
  }

  const amount = Math.round((last.value - base.value) * 100) / 100;
  return { amount, percent: base.value > 0 ? (amount / base.value) * 100 : null };
}

/** Titik dari `days` hari terakhir (plus titik pembanding tepat `days` hari lalu). */
export function sliceByDays(points: BalancePoint[], days: number): BalancePoint[] {
  if (points.length === 0) return points;
  const cutoff = addDays(points[points.length - 1].date, -days);
  const from = points.findIndex((p) => p.date >= cutoff);
  return from <= 0 ? points : points.slice(from);
}

/** Kurangi jumlah titik untuk rentang panjang; titik pertama dan terakhir selalu dipertahankan. */
export function downsample(points: BalancePoint[], maxPoints = 80): BalancePoint[] {
  if (points.length <= maxPoints) return points;
  const stride = Math.ceil((points.length - 1) / (maxPoints - 1));
  const out: BalancePoint[] = [];
  for (let i = 0; i < points.length; i += stride) out.push(points[i]);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}
