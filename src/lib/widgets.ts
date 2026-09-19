/**
 * Registry widget dashboard dan semua operasi tata letaknya.
 * File ini sengaja murni (tanpa React, tanpa Supabase) supaya dipakai server action,
 * komponen klien, dan tes yang sama.
 */

/* ── Ukuran ─────────────────────────────────────────────── */

export const WIDGET_SPANS = ["xs", "sm", "md", "lg", "xl"] as const;
export type WidgetSpan = (typeof WIDGET_SPANS)[number];

/** Lebar dalam grid 12 kolom (layar ≥ 1280px). Layar lebih kecil memetakan ulang lewat CSS. */
export const SPAN_COLUMNS: Record<WidgetSpan, number> = { xs: 3, sm: 4, md: 6, lg: 8, xl: 12 };
export const SPAN_LABEL: Record<WidgetSpan, string> = { xs: "¼", sm: "⅓", md: "½", lg: "⅔", xl: "Penuh" };
export const SPAN_NAME: Record<WidgetSpan, string> = {
  xs: "seperempat lebar",
  sm: "sepertiga lebar",
  md: "setengah lebar",
  lg: "dua pertiga lebar",
  xl: "selebar layar",
};

export const WIDGET_ROWS = [1, 2, 3] as const;
export type WidgetRows = (typeof WIDGET_ROWS)[number];

/* ── Registry ───────────────────────────────────────────── */

export const WIDGET_KEYS = [
  "balance",
  "income",
  "expense",
  "net",
  "flow",
  "accounts",
  "categories",
  "goals",
  "tasks",
  "recent",
  "shopping",
  "wishlist",
] as const;
export type WidgetKey = (typeof WIDGET_KEYS)[number];

export type WidgetGroup = "keuangan" | "kehidupan";

export type WidgetDef = {
  key: WidgetKey;
  title: string;
  description: string;
  group: WidgetGroup;
  /** Lebar yang boleh dipilih. */
  spans: readonly WidgetSpan[];
  /** Tinggi (jumlah baris) yang boleh dipilih. */
  rows: readonly WidgetRows[];
  defaultSpan: WidgetSpan;
  defaultRows: WidgetRows;
  defaultVisible: boolean;
};

export const WIDGETS: Record<WidgetKey, WidgetDef> = {
  balance: {
    key: "balance",
    title: "Total saldo",
    description: "Saldo gabungan, perubahan bulan ini, dan grafik riwayat. Latarnya bisa diganti fotomu sendiri.",
    group: "keuangan",
    spans: ["sm", "md", "lg", "xl"],
    rows: [1, 2, 3],
    defaultSpan: "md",
    defaultRows: 2,
    defaultVisible: true,
  },
  income: {
    key: "income",
    title: "Pemasukan",
    description: "Pemasukan bulan ini dan enam bulan terakhir.",
    group: "keuangan",
    spans: ["xs", "sm", "md", "lg"],
    rows: [1, 2],
    defaultSpan: "xs",
    defaultRows: 1,
    defaultVisible: true,
  },
  expense: {
    key: "expense",
    title: "Pengeluaran",
    description: "Pengeluaran bulan ini dibanding bulan lalu.",
    group: "keuangan",
    spans: ["xs", "sm", "md", "lg"],
    rows: [1, 2],
    defaultSpan: "xs",
    defaultRows: 1,
    defaultVisible: true,
  },
  net: {
    key: "net",
    title: "Tabungan bulan ini",
    description: "Pemasukan dikurangi pengeluaran, lengkap dengan persentasenya.",
    group: "keuangan",
    spans: ["xs", "sm", "md", "lg"],
    rows: [1, 2],
    defaultSpan: "md",
    defaultRows: 1,
    defaultVisible: true,
  },
  flow: {
    key: "flow",
    title: "Pemasukan vs pengeluaran",
    description: "Perbandingan enam bulan terakhir. Sentuh satu bulan untuk melihat rinciannya.",
    group: "keuangan",
    spans: ["md", "lg", "xl"],
    rows: [2, 3],
    defaultSpan: "lg",
    defaultRows: 2,
    defaultVisible: true,
  },
  accounts: {
    key: "accounts",
    title: "Saldo per akun",
    description: "Rekening, e-wallet, dan tunai beserta porsinya dari total.",
    group: "keuangan",
    spans: ["sm", "md", "lg"],
    rows: [1, 2, 3],
    defaultSpan: "sm",
    defaultRows: 2,
    defaultVisible: true,
  },
  categories: {
    key: "categories",
    title: "Pengeluaran per kategori",
    description: "Ke mana uang bulan ini pergi. Sentuh irisan untuk detail.",
    group: "keuangan",
    spans: ["sm", "md", "lg", "xl"],
    rows: [2, 3],
    defaultSpan: "sm",
    defaultRows: 2,
    defaultVisible: true,
  },
  goals: {
    key: "goals",
    title: "Target tabungan",
    description: "Kemajuan tiap target dan sisa waktunya.",
    group: "keuangan",
    spans: ["sm", "md", "lg"],
    rows: [1, 2, 3],
    defaultSpan: "sm",
    defaultRows: 2,
    defaultVisible: true,
  },
  tasks: {
    key: "tasks",
    title: "Tugas",
    description: "Tugas yang belum selesai. Centang langsung dari dashboard.",
    group: "kehidupan",
    spans: ["sm", "md", "lg"],
    rows: [1, 2, 3],
    defaultSpan: "sm",
    defaultRows: 2,
    defaultVisible: true,
  },
  recent: {
    key: "recent",
    title: "Transaksi terbaru",
    description: "Catatan terakhir dari kalian berdua.",
    group: "keuangan",
    spans: ["sm", "md", "lg", "xl"],
    rows: [1, 2, 3],
    defaultSpan: "xl",
    defaultRows: 2,
    defaultVisible: true,
  },
  shopping: {
    key: "shopping",
    title: "Daftar belanja",
    description: "Yang masih harus dibeli. Centang saat sudah masuk keranjang.",
    group: "kehidupan",
    spans: ["sm", "md", "lg"],
    rows: [1, 2, 3],
    defaultSpan: "sm",
    defaultRows: 2,
    defaultVisible: false,
  },
  wishlist: {
    key: "wishlist",
    title: "Wishlist",
    description: "Barang incaran yang belum terbeli, diurutkan dari yang paling diinginkan.",
    group: "kehidupan",
    spans: ["sm", "md", "lg"],
    rows: [1, 2, 3],
    defaultSpan: "sm",
    defaultRows: 2,
    defaultVisible: false,
  },
};

export function isWidgetKey(value: unknown): value is WidgetKey {
  return typeof value === "string" && (WIDGET_KEYS as readonly string[]).includes(value);
}

export function isWidgetSpan(value: unknown): value is WidgetSpan {
  return typeof value === "string" && (WIDGET_SPANS as readonly string[]).includes(value);
}

/* ── State tata letak ───────────────────────────────────── */

export type WidgetState = {
  key: WidgetKey;
  span: WidgetSpan;
  rows: WidgetRows;
  visible: boolean;
};

/** Baris mentah dari tabel dashboard_widgets (semua bisa salah bentuk; dinormalkan di bawah). */
export type SavedWidgetRow = {
  widget_key?: unknown;
  position?: unknown;
  span?: unknown;
  row_span?: unknown;
  is_visible?: unknown;
  config?: unknown;
};

export function defaultLayout(): WidgetState[] {
  return WIDGET_KEYS.map((key) => {
    const def = WIDGETS[key];
    return { key, span: def.defaultSpan, rows: def.defaultRows, visible: def.defaultVisible };
  });
}

function nearest<T extends number>(target: number, options: readonly T[], fallback: T): T {
  if (options.length === 0) return fallback;
  let best = options[0];
  for (const option of options) {
    if (Math.abs(option - target) < Math.abs(best - target)) best = option;
  }
  return best;
}

/** Lebar terdekat yang diizinkan widget, dari jumlah kolom (1–12) yang diinginkan. */
export function nearestSpan(key: WidgetKey, columns: number): WidgetSpan {
  const def = WIDGETS[key];
  let best = def.spans[0];
  for (const span of def.spans) {
    if (Math.abs(SPAN_COLUMNS[span] - columns) < Math.abs(SPAN_COLUMNS[best] - columns)) best = span;
  }
  return best;
}

/** Tinggi terdekat yang diizinkan widget. */
export function nearestRows(key: WidgetKey, rows: number): WidgetRows {
  const def = WIDGETS[key];
  return nearest(rows, def.rows, def.defaultRows);
}

function coerceSpan(key: WidgetKey, value: unknown): WidgetSpan {
  const def = WIDGETS[key];
  return isWidgetSpan(value) && def.spans.includes(value) ? value : def.defaultSpan;
}

function coerceRows(key: WidgetKey, value: unknown): WidgetRows {
  const def = WIDGETS[key];
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && (def.rows as readonly number[]).includes(n) ? (n as WidgetRows) : def.defaultRows;
}

/**
 * Menggabungkan susunan tersimpan dengan registry:
 *  - kunci yang tidak dikenal dibuang, duplikat diambil yang pertama;
 *  - ukuran yang tidak lagi diizinkan dikembalikan ke bawaan;
 *  - widget baru (belum pernah disimpan) ditambahkan di akhir dengan pengaturan bawaannya.
 * Tanpa data tersimpan, hasilnya persis defaultLayout().
 */
export function resolveLayout(saved: SavedWidgetRow[] | null | undefined): WidgetState[] {
  if (!saved || saved.length === 0) return defaultLayout();

  const seen = new Set<WidgetKey>();
  const rows = saved
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => isWidgetKey(row.widget_key))
    .sort((a, b) => {
      const pa = Number(a.row.position);
      const pb = Number(b.row.position);
      const na = Number.isFinite(pa) ? pa : Number.MAX_SAFE_INTEGER;
      const nb = Number.isFinite(pb) ? pb : Number.MAX_SAFE_INTEGER;
      return na - nb || a.index - b.index;
    });

  const result: WidgetState[] = [];
  for (const { row } of rows) {
    const key = row.widget_key as WidgetKey;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      key,
      span: coerceSpan(key, row.span),
      rows: coerceRows(key, row.row_span),
      visible: row.is_visible !== false,
    });
  }

  for (const state of defaultLayout()) {
    if (!seen.has(state.key)) result.push(state);
  }
  return result;
}

export function visibleWidgets(layout: WidgetState[]): WidgetState[] {
  return layout.filter((w) => w.visible);
}

export function hiddenWidgets(layout: WidgetState[]): WidgetState[] {
  return layout.filter((w) => !w.visible);
}

/**
 * Memindahkan widget ke urutan tampil ke-`toVisibleIndex` (hanya menghitung yang terlihat).
 * Widget tersembunyi tetap di tempatnya relatif terhadap tetangganya.
 */
export function moveVisible(layout: WidgetState[], key: WidgetKey, toVisibleIndex: number): WidgetState[] {
  const visible = visibleWidgets(layout);
  const from = visible.findIndex((w) => w.key === key);
  if (from === -1) return layout;

  const to = Math.min(visible.length - 1, Math.max(0, toVisibleIndex));
  if (to === from) return layout;

  const anchorKey = visible[to].key;
  const moving = layout.find((w) => w.key === key)!;
  const rest = layout.filter((w) => w.key !== key);
  const anchorIndex = rest.findIndex((w) => w.key === anchorKey);

  // Bergerak ke depan → sesudah jangkar; ke belakang → sebelum jangkar.
  const insertAt = to > from ? anchorIndex + 1 : anchorIndex;
  return [...rest.slice(0, insertAt), moving, ...rest.slice(insertAt)];
}

/** Geser satu langkah (untuk keyboard). */
export function nudgeVisible(layout: WidgetState[], key: WidgetKey, delta: -1 | 1): WidgetState[] {
  const index = visibleWidgets(layout).findIndex((w) => w.key === key);
  if (index === -1) return layout;
  return moveVisible(layout, key, index + delta);
}

export function resizeWidget(
  layout: WidgetState[],
  key: WidgetKey,
  next: { span?: WidgetSpan; rows?: WidgetRows }
): WidgetState[] {
  const def = WIDGETS[key];
  let changed = false;

  const result = layout.map((w) => {
    if (w.key !== key) return w;
    const span = next.span && def.spans.includes(next.span) ? next.span : w.span;
    const rows = next.rows && def.rows.includes(next.rows) ? next.rows : w.rows;
    if (span === w.span && rows === w.rows) return w;
    changed = true;
    return { ...w, span, rows };
  });

  return changed ? result : layout;
}

export function hideWidget(layout: WidgetState[], key: WidgetKey): WidgetState[] {
  return layout.map((w) => (w.key === key && w.visible ? { ...w, visible: false } : w));
}

/** Menampilkan lagi widget tersembunyi: ditaruh di akhir, dengan ukuran bawaannya. */
export function showWidget(layout: WidgetState[], key: WidgetKey): WidgetState[] {
  const target = layout.find((w) => w.key === key);
  if (!target || target.visible) return layout;
  const def = WIDGETS[key];
  const revived: WidgetState = { key, span: def.defaultSpan, rows: def.defaultRows, visible: true };
  return [...layout.filter((w) => w.key !== key), revived];
}

export function layoutsEqual(a: WidgetState[], b: WidgetState[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((w, i) => {
    const o = b[i];
    return w.key === o.key && w.span === o.span && w.rows === o.rows && w.visible === o.visible;
  });
}

/* ── Simpan ke database ─────────────────────────────────── */

export type WidgetPayloadRow = {
  widget_key: WidgetKey;
  position: number;
  span: WidgetSpan;
  row_span: WidgetRows;
  is_visible: boolean;
};

export function toPayload(layout: WidgetState[]): WidgetPayloadRow[] {
  return layout.map((w, position) => ({
    widget_key: w.key,
    position,
    span: w.span,
    row_span: w.rows,
    is_visible: w.visible,
  }));
}

/**
 * Memvalidasi kiriman dari klien (tidak dipercaya). Mengembalikan susunan bersih
 * atau pesan galat. Semua widget di registry selalu ada di hasilnya.
 */
export function parseLayoutInput(input: unknown): { ok: true; layout: WidgetState[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: "Susunan widget tidak valid." };
  if (input.length > WIDGET_KEYS.length * 2) return { ok: false, error: "Susunan widget terlalu panjang." };

  const seen = new Set<WidgetKey>();
  const layout: WidgetState[] = [];

  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return { ok: false, error: "Susunan widget tidak valid." };
    const item = raw as Record<string, unknown>;
    if (!isWidgetKey(item.key)) return { ok: false, error: "Ada widget yang tidak dikenal." };
    const key = item.key;
    if (seen.has(key)) return { ok: false, error: "Ada widget yang muncul dua kali." };
    seen.add(key);

    const def = WIDGETS[key];
    if (!isWidgetSpan(item.span) || !def.spans.includes(item.span)) {
      return { ok: false, error: `Lebar ${def.title} tidak diizinkan.` };
    }
    const rows = Number(item.rows);
    if (!Number.isInteger(rows) || !(def.rows as readonly number[]).includes(rows)) {
      return { ok: false, error: `Tinggi ${def.title} tidak diizinkan.` };
    }
    if (typeof item.visible !== "boolean") return { ok: false, error: "Susunan widget tidak valid." };

    layout.push({ key, span: item.span, rows: rows as WidgetRows, visible: item.visible });
  }

  for (const state of defaultLayout()) {
    if (!seen.has(state.key)) layout.push({ ...state, visible: false });
  }
  return { ok: true, layout };
}

/* ── Pengaturan kartu Total saldo ───────────────────────── */

export type BalanceStyle = {
  /** Foto latar. null = latar otomatis mengikuti tema. */
  bg_url: string | null;
  /** Seberapa gelap foto ditutup supaya angka tetap terbaca (0–80). */
  bg_dim: number;
};

export const DEFAULT_BALANCE_STYLE: BalanceStyle = { bg_url: null, bg_dim: 40 };
export const BG_DIM_MIN = 10;
export const BG_DIM_MAX = 80;

export function sanitizeBalanceStyle(input: unknown): BalanceStyle {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};

  let bg_url: string | null = null;
  if (typeof source.bg_url === "string" && source.bg_url.trim()) {
    try {
      const url = new URL(source.bg_url.trim());
      if (url.protocol === "https:" || url.protocol === "http:") bg_url = url.toString();
    } catch {
      bg_url = null;
    }
  }

  const dimRaw = Number(source.bg_dim);
  const bg_dim = Number.isFinite(dimRaw)
    ? Math.min(BG_DIM_MAX, Math.max(BG_DIM_MIN, Math.round(dimRaw)))
    : DEFAULT_BALANCE_STYLE.bg_dim;

  return { bg_url, bg_dim };
}

/** Perkiraan ukuran piksel sebelum ResizeObserver mengukur (dipakai saat render server). */
export const ROW_HEIGHT_PX = 184;
export const GRID_GAP_PX = 16;

export function approxWidgetSize(span: WidgetSpan, rows: WidgetRows) {
  const width: Record<WidgetSpan, number> = { xs: 230, sm: 320, md: 500, lg: 680, xl: 1040 };
  return { width: width[span], height: rows * ROW_HEIGHT_PX + (rows - 1) * GRID_GAP_PX };
}
