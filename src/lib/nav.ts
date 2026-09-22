import {
  ArrowLeftRight,
  ListChecks,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  ShoppingCart,
  Repeat,
  Settings,
  Tags,
  Target,
  Wallet,
  Bot,
  MapPinned,
  Heart,
  ClipboardList,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/ai", label: "KITA AI", icon: Bot },
  { href: "/dashboard/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/dashboard/accounts", label: "Akun", icon: Wallet },
  { href: "/dashboard/finance", label: "Keuangan", icon: Receipt },
  { href: "/dashboard/savings", label: "Tabungan & Target", icon: PiggyBank },
  { href: "/dashboard/recurring", label: "Berlangganan", icon: Repeat },
  { href: "/dashboard/calendar", label: "Calendar KITA", icon: ListChecks },
  { href: "/dashboard/routes", label: "Rute & Rencana", icon: MapPinned },
  { href: "/dashboard/shopping", label: "Belanja", icon: ShoppingCart },
  { href: "/dashboard/budget", label: "Anggaran", icon: ClipboardList },
  { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
  { href: "/dashboard/categories", label: "Kategori", icon: Tags },
  { href: "/dashboard/share", label: "Share Story", icon: Target },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
] as const;

export const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { href: "/dashboard/ai", label: "KITA AI", icon: Bot },
  { href: "/dashboard/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/dashboard/finance", label: "Keuangan", icon: Receipt },
] as const;

export const MOBILE_NAV_DEFAULTS = MOBILE_NAV_ITEMS.map((item) => item.href);

export function getMobileNavItems(value: unknown) {
  if (!Array.isArray(value)) return MOBILE_NAV_DEFAULTS;
  const paths = value.filter((path): path is string => typeof path === "string");
  const selected = NAV_ITEMS.filter((item) => paths.includes(item.href)).map((item) => item.href);
  return selected.length ? selected.slice(0, 4) : MOBILE_NAV_DEFAULTS;
}
