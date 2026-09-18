import {
  Banknote,
  Bike,
  Book,
  Briefcase,
  Bus,
  Car,
  CircleDashed,
  Clapperboard,
  Coffee,
  CreditCard,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Lightbulb,
  PawPrint,
  Phone,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Train,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────
   Ikon kategori — semuanya ikon garis, tidak ada emoji.
   ──────────────────────────────────────────────────────────── */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  car: Car,
  bus: Bus,
  train: Train,
  bike: Bike,
  fuel: Fuel,
  plane: Plane,
  receipt: Receipt,
  wifi: Wifi,
  phone: Phone,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  shirt: Shirt,
  clapperboard: Clapperboard,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  house: House,
  wrench: Wrench,
  "paw-print": PawPrint,
  "graduation-cap": GraduationCap,
  book: Book,
  laptop: Laptop,
  smartphone: Smartphone,
  gift: Gift,
  sparkles: Sparkles,
  wallet: Wallet,
  briefcase: Briefcase,
  "hand-coins": HandCoins,
  "trending-up": TrendingUp,
  "piggy-bank": PiggyBank,
  lightbulb: Lightbulb,
  banknote: Banknote,
  "circle-dashed": CircleDashed,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

/** Tebakan ikon dari nama kategori, dipakai kalau icon_key belum diisi. */
const NAME_HINTS: [RegExp, string][] = [
  [/makan|kuliner|jajan|resto|food/i, "utensils"],
  [/kopi|cafe|coffee/i, "coffee"],
  [/transport|grab|gojek|ojek|taksi/i, "car"],
  [/bensin|bbm|pertamax|fuel/i, "fuel"],
  [/kereta|krl|mrt/i, "train"],
  [/pesawat|tiket|liburan|travel|trip/i, "plane"],
  [/tagihan|listrik|pln|air|pdam/i, "receipt"],
  [/internet|wifi|indihome/i, "wifi"],
  [/pulsa|telepon|hp/i, "smartphone"],
  [/belanja|shopping|mall/i, "shopping-bag"],
  [/baju|fashion|pakaian/i, "shirt"],
  [/hiburan|film|bioskop|netflix|spotify/i, "clapperboard"],
  [/kesehatan|obat|dokter|rumah sakit/i, "heart-pulse"],
  [/gym|olahraga|fitness/i, "dumbbell"],
  [/rumah|sewa|kos|kontrakan/i, "house"],
  [/servis|perbaikan|bengkel/i, "wrench"],
  [/peliharaan|kucing|anjing/i, "paw-print"],
  [/sekolah|kuliah|kursus|pendidikan/i, "graduation-cap"],
  [/hadiah|kado|gift/i, "gift"],
  [/gaji|salary|upah/i, "wallet"],
  [/bonus|thr/i, "sparkles"],
  [/freelance|proyek|usaha/i, "briefcase"],
  [/investasi|saham|reksa|crypto/i, "trending-up"],
  [/tabungan|nabung/i, "piggy-bank"],
];

export function categoryIcon(iconKey?: string | null, name?: string | null): LucideIcon {
  if (iconKey && CATEGORY_ICONS[iconKey]) return CATEGORY_ICONS[iconKey];
  if (name) {
    for (const [pattern, key] of NAME_HINTS) {
      if (pattern.test(name)) return CATEGORY_ICONS[key];
    }
  }
  return CircleDashed;
}

/* ────────────────────────────────────────────────────────────
   Bank dan e-wallet Indonesia.
   Dilambangkan dengan monogram berwarna merek + ikon garis,
   bukan logo asli, karena logo bank dilindungi hak cipta.
   ──────────────────────────────────────────────────────────── */
export type BrandMark = {
  key: string;
  label: string;
  short: string;
  color: string;
  kind: "bank" | "ewallet" | "cash" | "other";
  icon: LucideIcon;
};

export const BRANDS: BrandMark[] = [
  { key: "bca", label: "BCA", short: "BCA", color: "#0066AE", kind: "bank", icon: Landmark },
  { key: "mandiri", label: "Mandiri", short: "MDR", color: "#003D79", kind: "bank", icon: Landmark },
  { key: "bri", label: "BRI", short: "BRI", color: "#00529C", kind: "bank", icon: Landmark },
  { key: "bni", label: "BNI", short: "BNI", color: "#F15A22", kind: "bank", icon: Landmark },
  { key: "btn", label: "BTN", short: "BTN", color: "#F5A623", kind: "bank", icon: Landmark },
  { key: "bsi", label: "BSI", short: "BSI", color: "#00A39D", kind: "bank", icon: Landmark },
  { key: "cimb", label: "CIMB Niaga", short: "CMB", color: "#A11F2C", kind: "bank", icon: Landmark },
  { key: "permata", label: "Permata", short: "PMT", color: "#00529B", kind: "bank", icon: Landmark },
  { key: "danamon", label: "Danamon", short: "DNM", color: "#005BAA", kind: "bank", icon: Landmark },
  { key: "ocbc", label: "OCBC", short: "OCB", color: "#E4002B", kind: "bank", icon: Landmark },
  { key: "panin", label: "Panin", short: "PNN", color: "#00539B", kind: "bank", icon: Landmark },
  { key: "maybank", label: "Maybank", short: "MYB", color: "#FFC000", kind: "bank", icon: Landmark },
  { key: "jago", label: "Jago", short: "JGO", color: "#FF6B00", kind: "bank", icon: Landmark },
  { key: "seabank", label: "SeaBank", short: "SEA", color: "#EE4D2D", kind: "bank", icon: Landmark },
  { key: "blu", label: "blu by BCA", short: "BLU", color: "#00B5E2", kind: "bank", icon: Landmark },
  { key: "neo", label: "Bank Neo", short: "NEO", color: "#FDB913", kind: "bank", icon: Landmark },
  { key: "jenius", label: "Jenius", short: "JNS", color: "#00A0DF", kind: "bank", icon: Landmark },
  { key: "gopay", label: "GoPay", short: "GP", color: "#00AA13", kind: "ewallet", icon: Wallet },
  { key: "ovo", label: "OVO", short: "OVO", color: "#4C3494", kind: "ewallet", icon: Wallet },
  { key: "dana", label: "DANA", short: "DN", color: "#118EEA", kind: "ewallet", icon: Wallet },
  { key: "shopeepay", label: "ShopeePay", short: "SP", color: "#EE4D2D", kind: "ewallet", icon: Wallet },
  { key: "linkaja", label: "LinkAja", short: "LA", color: "#E62129", kind: "ewallet", icon: Wallet },
  { key: "flip", label: "Flip", short: "FLP", color: "#FF8B00", kind: "ewallet", icon: Wallet },
  { key: "paypal", label: "PayPal", short: "PP", color: "#003087", kind: "ewallet", icon: CreditCard },
  { key: "cash", label: "Uang tunai", short: "TN", color: "#4B6151", kind: "cash", icon: Banknote },
  { key: "other", label: "Lainnya", short: "—", color: "#7A7A75", kind: "other", icon: CreditCard },
];

const BRAND_MAP = new Map(BRANDS.map((b) => [b.key, b]));

export function brandFor(iconKey?: string | null, name?: string | null): BrandMark {
  if (iconKey && BRAND_MAP.has(iconKey)) return BRAND_MAP.get(iconKey)!;
  if (name) {
    const lower = name.toLowerCase().replace(/\s+/g, "");
    const hit = BRANDS.find((b) => lower.includes(b.key) || lower.includes(b.label.toLowerCase().replace(/\s+/g, "")));
    if (hit) return hit;
    if (/tunai|cash/i.test(name)) return BRAND_MAP.get("cash")!;
  }
  return BRAND_MAP.get("other")!;
}
