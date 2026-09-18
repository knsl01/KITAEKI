import {
  ArrowLeftRight,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  Repeat,
  Settings,
  Tags,
  Target,
  Wallet,
  BarChart3,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/dashboard/accounts", label: "Akun & Saldo", icon: Wallet },
  { href: "/dashboard/finance", label: "Keuangan", icon: Receipt },
  { href: "/dashboard/budget", label: "Anggaran", icon: Target },
  { href: "/dashboard/savings", label: "Tabungan & Target", icon: PiggyBank },
  { href: "/dashboard/recurring", label: "Berulang", icon: Repeat },
  { href: "/dashboard/reports", label: "Laporan", icon: BarChart3 },
  { href: "/dashboard/categories", label: "Kategori", icon: Tags },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
] as const;

export const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/dashboard/budget", label: "Anggaran", icon: Target },
  { href: "/dashboard/savings", label: "Target", icon: PiggyBank },
] as const;
