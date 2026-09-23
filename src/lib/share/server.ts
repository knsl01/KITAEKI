/**
 * Menyiapkan data untuk kartu Share Story (server). Semua dihitung dari tabel yang sudah ada;
 * RLS memastikan hanya data household milik user yang terbaca.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, buildBalanceHistory, changeSince, endOfPreviousMonth, isoDateInZone, type BalanceTx } from "@/lib/balance-history";
import { groupByCategory, sumTotals } from "@/lib/analytics";
import { monthLabel } from "@/lib/format";
import type { Workspace } from "@/lib/workspace";
import type { ShareData, ShareGoal, ShareMember } from "./types";

/** Alamat yang dimuat di QR. Ganti lewat env NEXT_PUBLIC_APP_URL (tanpa tanda kutip). */
export const DEFAULT_APP_URL = "https://kind.knsl.tech";

function appUrl() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/^["']|["']$/g, "");
  if (!raw) return DEFAULT_APP_URL;
  return /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`;
}

const MAX_IMAGE_CHARS = 350_000; // hindari membengkakkan payload halaman dengan gambar base64 raksasa

export async function getShareData(supabase: SupabaseClient, workspace: Workspace): Promise<ShareData> {
  const today = isoDateInZone(new Date());
  const windowDays = 90;
  const winStart = addDays(today, -windowDays);
  const thisMonth = today.slice(0, 7);
  const prevMonth = endOfPreviousMonth(today).slice(0, 7);

  const [accRes, txRes, catRes, goalRes, countRes] = await Promise.all([
    supabase.from("accounts").select("id, balance, created_at").eq("is_active", true),
    supabase
      .from("transactions")
      .select("type, amount, occurred_on, category_id, account_id, to_account_id")
      .is("archived_at", null)
      .gte("occurred_on", winStart)
      .limit(5000),
    supabase.from("categories").select("id, name, color"),
    supabase.from("savings_goals").select("id, name, target_amount, current_amount, target_date, image_url, is_archived").order("created_at"),
    supabase.from("transactions").select("id", { count: "exact", head: true }).is("archived_at", null),
  ]);

  const accounts = (accRes.data ?? []) as { id: string; balance: number | string; created_at: string }[];
  const txs = (txRes.data ?? []) as (BalanceTx & { category_id: string | null })[];
  const categories = (catRes.data ?? []) as { id: string; name: string; color: string }[];

  const totalBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

  // bulan ini vs bulan lalu
  const monthTx = txs.filter((t) => t.occurred_on.startsWith(thisMonth));
  const prevTx = txs.filter((t) => t.occurred_on.startsWith(prevMonth));
  const asTotals = (rows: typeof txs) => rows.map((t) => ({ type: t.type, amount: Number(t.amount) || 0 })) as unknown as Parameters<typeof sumTotals>[0];
  const cur = sumTotals(asTotals(monthTx));
  const prev = sumTotals(asTotals(prevTx));
  const savingsRate = cur.income > 0 ? ((cur.income - cur.expense) / cur.income) * 100 : null;
  const expenseTrend = prev.expense > 0 ? ((cur.expense - prev.expense) / prev.expense) * 100 : null;

  const cats = groupByCategory(monthTx as unknown as Parameters<typeof groupByCategory>[0], categories, "expense").slice(0, 8);

  // riwayat saldo
  const history = buildBalanceHistory({ accounts, transactions: txs, today, days: windowDays });
  const change30 = changeSince(history, addDays(today, -30));

  // streak: hari beruntun (sampai hari ini, atau kemarin kalau hari ini belum mencatat)
  const activeSet = new Set(txs.map((t) => t.occurred_on));
  let cursor = activeSet.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (activeSet.has(cursor) && streak < windowDays) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  const cutoff = addDays(today, -34);
  const activeDays = [...activeSet].filter((d) => d >= cutoff && d <= today);

  // target tabungan
  const goalRows = (goalRes.data ?? []) as {
    id: string;
    name: string;
    target_amount: number | string;
    current_amount: number | string;
    target_date: string | null;
    image_url: string | null;
    is_archived: boolean;
  }[];
  const goalsDone = goalRows.filter((g) => Number(g.target_amount) > 0 && Number(g.current_amount) >= Number(g.target_amount)).length;
  const goals: ShareGoal[] = goalRows
    .filter((g) => !g.is_archived)
    .map((g, i) => ({
      id: g.id,
      name: g.name,
      target: Number(g.target_amount) || 0,
      current: Number(g.current_amount) || 0,
      targetDate: g.target_date,
      imageUrl: i < 6 && g.image_url && g.image_url.length < MAX_IMAGE_CHARS ? g.image_url : null,
    }));

  const members: ShareMember[] = (["eki", "dinda"] as const)
    .map((key) => {
      const m = workspace.members.find((x) => x.member_key === key);
      if (!m) return null;
      return {
        key,
        name: (m.full_name || "").trim().split(/\s+/)[0] || (key === "eki" ? "Eki" : "Dinda"),
        avatar: m.avatar_url && m.avatar_url.length < MAX_IMAGE_CHARS ? m.avatar_url : null,
      } satisfies ShareMember;
    })
    .filter((m): m is ShareMember => m !== null);

  const label = monthLabel(thisMonth);
  const [monthName, year] = [label.split(" ")[0], label.split(" ").slice(1).join(" ")];

  return {
    coupleName: workspace.coupleName,
    members,
    today,
    appUrl: appUrl(),
    totalBalance,
    accountCount: accounts.length,
    monthLabel: label,
    monthName,
    year,
    income: cur.income,
    expense: cur.expense,
    net: cur.net,
    savingsRate,
    expenseTrend,
    txCountMonth: monthTx.length,
    txCountTotal: countRes.count ?? txs.length,
    series: history.map((p) => ({ date: p.date, value: p.value })),
    change30,
    categories: cats.map((c) => ({ name: c.name, value: c.value, color: c.color })),
    goals,
    goalsDone,
    streak,
    activeDays,
  };
}
