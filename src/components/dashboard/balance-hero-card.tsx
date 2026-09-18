"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { brandFor } from "@/lib/icons";
import {
  downsample,
  sliceByDays,
  type BalanceChange,
  type BalancePoint,
} from "@/lib/balance-history";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export type HeroAccount = { id: string; name: string; icon_key: string | null };

type Props = {
  total: number;
  /** Saldo gabungan per hari, dari yang paling lama ke hari ini. */
  history: BalancePoint[];
  /** Perubahan saldo sejak akhir bulan lalu. */
  monthChange: BalanceChange | null;
  income: number;
  expense: number;
  accounts: HeroAccount[];
  viewLabel: string;
};

const PERIODS = [
  { key: "7D", days: 7, label: "7 hari terakhir" },
  { key: "1M", days: 30, label: "30 hari terakhir" },
  { key: "3M", days: 90, label: "3 bulan terakhir" },
  { key: "1Y", days: 365, label: "1 tahun terakhir" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

/* Ruang gambar grafik. Diregangkan penuh oleh SVG, garisnya tetap tipis (non-scaling-stroke). */
const W = 1000;
const H = 200;
const PAD_TOP = 28;
const PAD_BOTTOM = 26;
const X_MAX = W - 14; // sisakan ruang di kanan supaya titik terakhir tidak terpotong

const percentFormat = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function signedCurrency(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function signedPercent(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${percentFormat.format(Math.abs(value))}%`;
}

function formatDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

/** Kurva halus yang tidak pernah melampaui titik datanya (monotone cubic, Fritsch–Carlson). */
function monotonePath(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    slope.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x));
  }

  const tangent: number[] = new Array(n).fill(0);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      tangent[i] = tau * a * slope[i];
      tangent[i + 1] = tau * b * slope[i];
    }
  }

  const r = (v: number) => Math.round(v * 100) / 100;
  let d = `M${r(pts[0].x)},${r(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const step = dx[i] / 3;
    d += ` C${r(pts[i].x + step)},${r(pts[i].y + tangent[i] * step)} ${r(pts[i + 1].x - step)},${r(
      pts[i + 1].y - tangent[i + 1] * step
    )} ${r(pts[i + 1].x)},${r(pts[i + 1].y)}`;
  }
  return d;
}

function toneOf(value: number) {
  if (value > 0) return "positive" as const;
  if (value < 0) return "negative" as const;
  return "neutral" as const;
}

const TONE_TEXT = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-muted-foreground",
} as const;

const TONE_PILL = {
  positive: "bg-positive/10 text-positive",
  negative: "bg-negative/10 text-negative",
  neutral: "bg-muted text-muted-foreground",
} as const;

function AccountMark({ account }: { account: HeroAccount }) {
  const brand = brandFor(account.icon_key, account.name);
  const Icon = brand.icon;
  const useIcon = brand.kind === "cash" || brand.kind === "other";

  return (
    <span
      title={account.name}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-semibold tracking-tight text-white"
      style={{ backgroundColor: brand.color }}
    >
      {useIcon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : brand.short}
      <span className="sr-only">{account.name}</span>
    </span>
  );
}

function FlowTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative";
}) {
  const Icon = tone === "positive" ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            tone === "positive" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
          )}
        >
          <Icon className="h-3 w-3" aria-hidden />
        </span>
        {label}
      </span>
      {/* Angka uang tidak pernah dipotong: ukurannya menyusut sedikit di layar sempit. */}
      <span className="tabular mt-2 block whitespace-nowrap text-sm font-medium tracking-tight sm:text-[15px]">
        {formatCurrency(value)}
      </span>
    </div>
  );
}

export function BalanceHeroCard({ total, history, monthChange, income, expense, accounts, viewLabel }: Props) {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("1M");
  const [hover, setHover] = useState<number | null>(null);
  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[1];

  const series = useMemo(() => downsample(sliceByDays(history, period.days)), [history, period.days]);

  const chart = useMemo(() => {
    if (series.length < 2) return null;

    const values = series.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    const usable = H - PAD_TOP - PAD_BOTTOM;

    const points = series.map((p, i) => ({
      x: (i / (series.length - 1)) * X_MAX,
      y: span === 0 ? H / 2 : PAD_TOP + (1 - (p.value - min) / span) * usable,
    }));

    const line = monotonePath(points);
    const last = points[points.length - 1];
    const area = `${line} L${W},${last.y} L${W},${H} L0,${H} Z`;
    return { points, line, area };
  }, [series]);

  const periodDelta = series.length >= 2 ? series[series.length - 1].value - series[0].value : null;
  const periodBase = series.length >= 2 ? series[0].value : 0;
  const periodPercent = periodDelta !== null && periodBase > 0 ? (periodDelta / periodBase) * 100 : null;

  function onPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (!chart) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const index = Math.round(((ratio * W) / X_MAX) * (series.length - 1));
    setHover(Math.min(series.length - 1, Math.max(0, index)));
  }

  const hovered = chart && hover !== null ? series[hover] : null;
  const hoveredPoint = chart && hover !== null ? chart.points[hover] : null;
  const endPoint = chart ? chart.points[chart.points.length - 1] : null;

  const monthTone = monthChange ? toneOf(monthChange.amount) : "neutral";
  const MonthIcon = monthTone === "positive" ? ArrowUpRight : monthTone === "negative" ? ArrowDownRight : Minus;

  const visibleAccounts = accounts.slice(0, 5);
  const extraAccounts = accounts.length - visibleAccounts.length;
  const negative = total < 0;

  const chartLabel = chart
    ? `Grafik riwayat saldo ${period.label}, dari ${formatCurrency(series[0].value)} menjadi ${formatCurrency(
        series[series.length - 1].value
      )}`
    : "Grafik riwayat saldo belum tersedia";

  return (
    <section
      aria-label="Total saldo"
      className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_16px_40px_-24px_hsl(var(--foreground)/0.16)]"
    >
      <div className="px-5 pt-5 sm:px-8 sm:pt-7">
        {/* Kepala: judul dan pemilih periode */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="font-serif text-lg tracking-tight sm:text-xl">Total saldo</h2>
            <span className="truncate text-xs text-muted-foreground">{viewLabel}</span>
          </div>

          <div role="radiogroup" aria-label="Periode grafik" className="inline-flex shrink-0 rounded-full bg-muted p-0.5">
            {PERIODS.map((p) => {
              const active = p.key === periodKey;
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setPeriodKey(p.key);
                    setHover(null);
                  }}
                  className={cn(
                    "h-7 min-w-[2.5rem] rounded-full px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-card text-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.1)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.key}
                </button>
              );
            })}
          </div>
        </div>

        {/* Isi: saldo sebagai fokus, ringkasan di sampingnya pada layar lebar */}
        <div className="mt-6 flex flex-col gap-6 lg:mt-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0">
            <p className="tabular flex items-baseline text-[2.5rem] font-medium leading-none tracking-[-0.035em] sm:text-5xl lg:text-[3.75rem]">
              <span className="mr-2 text-xl font-normal tracking-normal text-muted-foreground sm:text-2xl lg:text-3xl">Rp</span>
              <span className="min-w-0 truncate">
                {negative ? "−" : ""}
                {formatNumber(Math.abs(total))}
              </span>
            </p>

            {monthChange ? (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium",
                    TONE_PILL[monthTone]
                  )}
                >
                  <MonthIcon className="h-3.5 w-3.5" aria-hidden />
                  <span className="tabular">{signedCurrency(monthChange.amount)}</span>
                  {monthChange.percent !== null ? (
                    <span className="tabular font-normal opacity-80">{signedPercent(monthChange.percent)}</span>
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">bulan ini</span>
              </div>
            ) : null}
          </div>

          <div className="w-full space-y-4 lg:w-[23rem] lg:shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <FlowTile label="Pemasukan" value={income} tone="positive" />
              <FlowTile label="Pengeluaran" value={expense} tone="negative" />
            </div>

            {accounts.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {visibleAccounts.map((account) => (
                    <AccountMark key={account.id} account={account} />
                  ))}
                  {extraAccounts > 0 ? (
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                      +{extraAccounts}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">{accounts.length} akun aktif</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Keterangan grafik: berubah saat kursor/jari menyentuh grafik */}
        {chart ? (
          <div className="mt-7 flex h-5 items-baseline justify-between gap-3 text-xs" aria-live="off">
            {hovered ? (
              <>
                <span className="text-muted-foreground">{formatDay(hovered.date)}</span>
                <span className="tabular font-medium">{formatCurrency(hovered.value)}</span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">{period.label}</span>
                {periodDelta !== null ? (
                  <span className={cn("tabular font-medium", TONE_TEXT[toneOf(periodDelta)])}>
                    {signedCurrency(periodDelta)}
                    {periodPercent !== null ? (
                      <span className="ml-1.5 font-normal opacity-80">{signedPercent(periodPercent)}</span>
                    ) : null}
                  </span>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Grafik: penuh sampai tepi kartu, tanpa sumbu, tanpa garis bantu */}
      {chart && endPoint ? (
        <div
          role="img"
          aria-label={chartLabel}
          className="relative mt-2 h-[150px] cursor-crosshair select-none sm:h-[180px] lg:h-[200px]"
          style={{ touchAction: "pan-y" }}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setHover(null)}
          onPointerCancel={() => setHover(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            <path d={chart.area} className="fill-primary/10" />
            <path
              d={chart.line}
              className="fill-none stroke-primary"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {hoveredPoint ? (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-border"
                style={{ left: `${(hoveredPoint.x / W) * 100}%` }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-card"
                style={{ left: `${(hoveredPoint.x / W) * 100}%`, top: `${(hoveredPoint.y / H) * 100}%` }}
              />
            </>
          ) : (
            <span
              aria-hidden
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-[3px] ring-card"
              style={{ left: `${(endPoint.x / W) * 100}%`, top: `${(endPoint.y / H) * 100}%` }}
            />
          )}
        </div>
      ) : (
        <div className="mt-6 flex h-28 items-center justify-center border-t border-border/70 px-6 text-center text-sm text-muted-foreground">
          {accounts.length === 0
            ? "Tambah akun untuk mulai melihat riwayat saldo."
            : "Grafik muncul setelah saldo tercatat dalam beberapa hari."}
        </div>
      )}
    </section>
  );
}
