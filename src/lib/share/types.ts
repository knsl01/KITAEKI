/** Tipe bersama untuk fitur Share Story (server menyiapkan ShareData, klien menggambarnya ke canvas). */

export type ShareMember = { key: "eki" | "dinda"; name: string; avatar: string | null };

export type ShareGoal = {
  id: string;
  name: string;
  target: number;
  current: number;
  targetDate: string | null;
  imageUrl: string | null;
};

export type SharePoint = { date: string; value: number };

export type ShareData = {
  coupleName: string;
  members: ShareMember[];
  today: string; // yyyy-mm-dd
  /** Alamat yang dimuat di QR, mis. https://kind.knsl.tech */
  appUrl: string;
  totalBalance: number;
  accountCount: number;
  monthLabel: string; // "September 2026"
  monthName: string; // "September"
  year: string;
  income: number;
  expense: number;
  net: number;
  /** % penghasilan yang tersisa bulan ini; null kalau belum ada pemasukan. */
  savingsRate: number | null;
  /** Perubahan pengeluaran vs bulan lalu dalam % (negatif = lebih hemat); null kalau tak ada pembanding. */
  expenseTrend: number | null;
  txCountMonth: number;
  txCountTotal: number;
  series: SharePoint[];
  change30: { amount: number; percent: number | null } | null;
  categories: { name: string; value: number; color: string }[];
  goals: ShareGoal[];
  goalsDone: number;
  streak: number;
  /** Tanggal (yyyy-mm-dd) dalam 35 hari terakhir yang punya transaksi. */
  activeDays: string[];
};

export const TEMPLATE_IDS = [
  "balance",
  "trend",
  "cashflow",
  "goal",
  "goals",
  "milestone",
  "achievements",
  "categories",
  "couple",
  "monthly",
  "streak",
  "receipt",
  "quote",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATE_META: Record<TemplateId, { label: string; hint: string }> = {
  balance: { label: "Saldo", hint: "Total saldo + tren" },
  trend: { label: "Grafik", hint: "Pertumbuhan saldo" },
  cashflow: { label: "Arus Kas", hint: "Masuk vs keluar" },
  goal: { label: "Target", hint: "Satu target tabungan" },
  goals: { label: "Semua Target", hint: "Daftar mimpi kita" },
  milestone: { label: "Hampir!", hint: "Progres target terdekat" },
  achievements: { label: "Pencapaian", hint: "Lencana yang terbuka" },
  categories: { label: "Kategori", hint: "Ke mana uangnya" },
  couple: { label: "Berdua", hint: "Kartu pasangan" },
  monthly: { label: "Rekap", hint: "Ringkasan bulan ini" },
  streak: { label: "Streak", hint: "Konsisten mencatat" },
  receipt: { label: "Struk", hint: "Gaya struk belanja" },
  quote: { label: "Quote", hint: "Kutipan manis" },
};

export const PATTERN_IDS = ["none", "dots", "grid", "waves", "sparkles", "rings"] as const;
export type PatternId = (typeof PATTERN_IDS)[number];
export const PATTERN_LABEL: Record<PatternId, string> = {
  none: "Polos",
  dots: "Titik",
  grid: "Grid",
  waves: "Ombak",
  sparkles: "Kilau",
  rings: "Lingkar",
};

export type CardStyle = "glass" | "solid" | "line";
export const CARD_STYLE_LABEL: Record<CardStyle, string> = { glass: "Kaca", solid: "Solid", line: "Garis" };

export type ShareFormat = "story" | "feed";
export const FORMAT_SIZE: Record<ShareFormat, { w: number; h: number; label: string }> = {
  story: { w: 1080, h: 1920, label: "Story 9:16" },
  feed: { w: 1080, h: 1350, label: "Feed 4:5" },
};

export type ShareStyle = {
  template: TemplateId;
  theme: string;
  format: ShareFormat;
  cardStyle: CardStyle;
  pattern: PatternId;
  hideAmounts: boolean;
  showQr: boolean;
  showAvatars: boolean;
  range: 30 | 90;
  goalId: string | null;
  quote: string;
  caption: string;
};

/** Gambar yang sudah dimuat (avatar, foto target, logo, foto latar). */
export type ShareAssets = {
  logo: HTMLImageElement | null;
  avatars: Record<string, HTMLImageElement | null>;
  goals: Record<string, HTMLImageElement | null>;
  bg: HTMLImageElement | null;
};

export type ShareTheme = {
  id: string;
  label: string;
  dark: boolean;
  bg: [string, string, string];
  glowA: string;
  glowB: string;
  ink: string;
  accent: string;
  accent2: string;
  good: string;
  bad: string;
  /** Warna kartu solid. */
  solid: string;
};
