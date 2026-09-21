import type { ShareData } from "./types";

export type AchievementIcon = "heart" | "flame" | "trophy" | "shield" | "trend" | "crown" | "target" | "down" | "bolt" | "sparkle";

export type Achievement = {
  id: string;
  icon: AchievementIcon;
  title: string;
  desc: string;
  unlocked: boolean;
};

const BALANCE_TIERS: [number, string][] = [
  [1_000_000_000, "Klub 1 Miliar"],
  [500_000_000, "Klub 500 Juta"],
  [100_000_000, "Klub 100 Juta"],
  [50_000_000, "Klub 50 Juta"],
  [10_000_000, "Klub 10 Juta"],
  [1_000_000, "Klub 1 Juta"],
];

/** Lencana dihitung dari data yang sudah ada — tidak ada tabel baru. */
export function computeAchievements(d: ShareData): Achievement[] {
  const bestGoal = d.goals.reduce((m, g) => Math.max(m, g.target > 0 ? g.current / g.target : 0), 0);
  const tier = BALANCE_TIERS.find(([min]) => d.totalBalance >= min);
  const txTier = [500, 250, 100, 50, 10].find((n) => d.txCountTotal >= n);
  const streakTier = [30, 14, 7, 3].find((n) => d.streak >= n);

  return [
    { id: "couple", icon: "heart", title: "Berdua", desc: d.members.length > 1 ? "Akun terhubung" : "Ajak pasangan", unlocked: d.members.length > 1 },
    { id: "streak", icon: "flame", title: streakTier ? `Streak ${streakTier} hari` : "Rajin mencatat", desc: streakTier ? `${d.streak} hari beruntun` : "Catat 3 hari beruntun", unlocked: !!streakTier },
    { id: "done", icon: "trophy", title: "Target tercapai", desc: d.goalsDone > 0 ? `${d.goalsDone} target beres` : "Selesaikan 1 target", unlocked: d.goalsDone > 0 },
    { id: "saver", icon: "shield", title: "Hemat 20%+", desc: d.savingsRate != null && d.savingsRate >= 20 ? `Sisa ${Math.round(d.savingsRate)}% bulan ini` : "Sisihkan 20% penghasilan", unlocked: d.savingsRate != null && d.savingsRate >= 20 },
    { id: "growth", icon: "trend", title: "Saldo tumbuh", desc: d.change30 && d.change30.amount > 0 ? "Naik dalam 30 hari" : "Naikkan saldo 30 hari", unlocked: !!d.change30 && d.change30.amount > 0 },
    { id: "club", icon: "crown", title: tier ? tier[1] : "Klub 1 Juta", desc: tier ? "Saldo gabungan" : "Capai saldo 1 juta", unlocked: !!tier },
    { id: "half", icon: "target", title: "Setengah jalan", desc: bestGoal >= 0.5 ? "Target lewat 50%" : "Target tembus 50%", unlocked: bestGoal >= 0.5 },
    { id: "frugal", icon: "down", title: "Lebih hemat", desc: d.expenseTrend != null && d.expenseTrend < 0 ? `Turun ${Math.abs(Math.round(d.expenseTrend))}% vs lalu` : "Kurangi pengeluaran", unlocked: d.expenseTrend != null && d.expenseTrend < 0 },
    { id: "logger", icon: "bolt", title: txTier ? `${txTier}+ transaksi` : "Pencatat", desc: txTier ? "Dicatat berdua" : "Catat 10 transaksi", unlocked: !!txTier },
    { id: "dreamer", icon: "sparkle", title: "Punya mimpi", desc: d.goals.length ? `${d.goals.length} target aktif` : "Buat target pertama", unlocked: d.goals.length > 0 },
  ];
}
