"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowDownRight, ArrowUpRight, ImagePlus, Loader2, Minus } from "lucide-react";
import { updateBalanceStyle } from "@/app/actions/dashboard";
import { useWidgetBox } from "@/components/dashboard/widget-frame";
import { MediaUpload } from "@/components/media-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCountUp } from "@/hooks/use-count-up";
import { downsample, sliceByDays, type BalanceChange, type BalancePoint } from "@/lib/balance-history";
import { fitFontSize, monotonePath } from "@/lib/chart-utils";
import { formatCurrency, formatNumber } from "@/lib/format";
import { brandFor } from "@/lib/icons";
import { BG_DIM_MAX, BG_DIM_MIN, type BalanceStyle } from "@/lib/widgets";
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
  style: BalanceStyle;
  householdId: string | null;
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
const PAD_TOP = 24;
const PAD_BOTTOM = 18;
const X_MAX = W - 30;

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

function toneOf(value: number) {
  if (value > 0) return "positive" as const;
  if (value < 0) return "negative" as const;
  return "neutral" as const;
}

/* Warna saat kartu memakai foto: semua token dibalik ke terang, jadi seluruh isi kartu
   otomatis terbaca tanpa perlu cabang warna di setiap elemen. */
const IMAGE_TOKENS = {
  "--foreground": "0 0% 100%",
  "--muted-foreground": "0 0% 100% / 0.74",
  "--muted": "0 0% 100% / 0.16",
  "--primary": "0 0% 100%",
  "--positive": "146 62% 74%",
  "--negative": "6 100% 82%",
  "--border": "0 0% 100% / 0.22",
} as React.CSSProperties;

/* ── Potongan kecil ─────────────────────────────────────── */

function AccountMark({ account }: { account: HeroAccount }) {
  const brand = brandFor(account.icon_key, account.name);
  const Icon = brand.icon;
  const useIcon = brand.kind === "cash" || brand.kind === "other";

  return (
    <span
      title={account.name}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-semibold tracking-tight text-white ring-1 ring-black/10 transition-transform duration-200 hover:-translate-y-0.5"
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
  onImage,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative";
  onImage: boolean;
}) {
  const Icon = tone === "positive" ? ArrowDownLeft : ArrowUpRight;
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border px-3.5 py-3 backdrop-blur-sm",
        onImage ? "border-white/20 bg-white/10" : "border-border/70 bg-card/60"
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            tone === "positive" ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative"
          )}
        >
          <Icon className="h-3 w-3" aria-hidden />
        </span>
        {label}
      </span>
      <span className="tabular mt-2 block whitespace-nowrap text-sm font-medium tracking-tight sm:text-[15px]">
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function PeriodSwitch({
  value,
  onChange,
  onImage,
  compact,
}: {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  onImage: boolean;
  compact: boolean;
}) {
  const index = Math.max(0, PERIODS.findIndex((p) => p.key === value));

  return (
    <div
      role="radiogroup"
      aria-label="Periode grafik"
      className="relative grid shrink-0 grid-cols-4 rounded-full bg-muted p-0.5"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0.5 left-0.5 rounded-full shadow-[0_1px_2px_hsl(0_0%_0%/0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          onImage ? "bg-white" : "bg-card"
        )}
        style={{ width: "calc((100% - 4px) / 4)", transform: `translateX(${index * 100}%)` }}
      />
      {PERIODS.map((p) => {
        const active = p.key === value;
        return (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p.key)}
            className={cn(
              "relative z-10 rounded-full text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "h-6 min-w-[2rem] px-1.5" : "h-7 min-w-[2.5rem] px-2.5",
              active ? (onImage ? "text-neutral-900" : "text-foreground") : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.key}
          </button>
        );
      })}
    </div>
  );
}

/* ── Dialog latar ───────────────────────────────────────── */

function BackgroundDialog({
  householdId,
  style,
  total,
}: {
  householdId: string;
  style: BalanceStyle;
  total: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(style.bg_url);
  const [dim, setDim] = useState(style.bg_dim);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dimId = useId();

  function onOpenChange(next: boolean) {
    if (next) {
      setImage(style.bg_url);
      setDim(style.bg_dim);
      setError(null);
    }
    setOpen(next);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateBalanceStyle({ bg_url: image, bg_dim: dim });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Ubah latar kartu Total saldo"
          className="icon-lift flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Latar kartu Total saldo</DialogTitle>
          <DialogDescription>Pakai foto kalian sendiri. Tanpa foto, kartu mengikuti warna tema.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <MediaUpload
            householdId={householdId}
            folder="balance"
            value={image}
            onChange={setImage}
            label="Unggah foto latar"
          />

          {image ? (
            <>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor={dimId}>Gelapkan foto</Label>
                  <span className="tabular text-xs text-muted-foreground">{dim}%</span>
                </div>
                <input
                  id={dimId}
                  type="range"
                  min={BG_DIM_MIN}
                  max={BG_DIM_MAX}
                  step={5}
                  value={dim}
                  onChange={(e) => setDim(Number(e.target.value))}
                  className="w-full accent-[hsl(var(--primary))]"
                />
                <p className="text-xs text-muted-foreground">Makin gelap, angka makin mudah dibaca di atas foto yang terang.</p>
              </div>

              {/* Pratinjau angka di atas foto */}
              <div className="relative isolate h-24 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black" style={{ opacity: dim / 100 }} />
                <p className="tabular relative flex h-full items-end p-4 text-2xl font-medium tracking-tight text-white">
                  {formatCurrency(total)}
                </p>
              </div>
            </>
          ) : null}

          {error ? <p className="rounded-md bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p> : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setImage(null)} disabled={!image || pending}>
              Kembali ke tema
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Simpan latar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Kartu ──────────────────────────────────────────────── */

export function BalanceHeroCard({
  total,
  history,
  monthChange,
  income,
  expense,
  accounts,
  viewLabel,
  style,
  householdId,
}: Props) {
  const box = useWidgetBox();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("1M");
  const [hover, setHover] = useState<number | null>(null);
  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[1];
  const onImage = Boolean(style.bg_url);

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

  // ── ukuran → tata letak
  const wide = box.width >= 660;
  const narrow = box.width < 380;
  const tall = box.height >= 250; // grafik interaktif di bawah angka
  const showTiles = box.width >= 480 && box.height >= 330;
  const tilesBeside = showTiles && wide;
  const showMarks = accounts.length > 0 && tilesBeside && box.height >= 360;

  const counted = useCountUp(total);
  const negative = counted < 0;
  const digits = formatNumber(Math.abs(counted));
  const figureWidth = box.width - (narrow ? 40 : 56) - (tilesBeside ? 330 : 0);
  const numberSize = fitFontSize(digits.length + 3, figureWidth, wide ? 60 : 46, 24, 0.6);

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
  const startY = chart ? chart.points[0].y : 0;

  const monthTone = monthChange ? toneOf(monthChange.amount) : "neutral";
  const MonthIcon = monthTone === "positive" ? ArrowUpRight : monthTone === "negative" ? ArrowDownRight : Minus;

  const visibleAccounts = accounts.slice(0, 6);
  const extraAccounts = accounts.length - visibleAccounts.length;
  const gradientId = `bal-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const chartLabel = chart
    ? `Grafik riwayat saldo ${period.label}, dari ${formatCurrency(series[0].value)} menjadi ${formatCurrency(
        series[series.length - 1].value
      )}`
    : "Grafik riwayat saldo belum tersedia";

  return (
    <section
      aria-label="Total saldo"
      style={onImage ? IMAGE_TOKENS : undefined}
      className={cn(
        "widget-card relative isolate flex h-full min-h-0 flex-col",
        onImage ? "border-transparent text-white" : "balance-aurora"
      )}
    >
      {onImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={style.bg_url ?? ""} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-black" style={{ opacity: style.bg_dim / 100 }} />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
        </>
      ) : null}

      <div className={cn("shrink-0", narrow ? "px-4 pt-4" : "px-5 pt-4 sm:px-7 sm:pt-5")}>
        {/* Kepala */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <h2 className="truncate font-serif text-[1.0625rem] leading-6 tracking-tight">Total saldo</h2>
              {!narrow ? <span className="truncate text-xs text-muted-foreground">{viewLabel}</span> : null}
            </div>
            {householdId ? <BackgroundDialog householdId={householdId} style={style} total={total} /> : null}
          </div>
          <PeriodSwitch value={periodKey} onChange={(k) => { setPeriodKey(k); setHover(null); }} onImage={onImage} compact={narrow} />
        </div>

        {/* Angka + ringkasan */}
        <div className={cn("mt-3 flex gap-6", wide ? "flex-row items-end justify-between" : "flex-col")}>
          <div className="min-w-0">
            <p className="numeral tabular flex items-baseline whitespace-nowrap font-medium leading-none tracking-[-0.035em]" style={{ fontSize: numberSize }}>
              <span className="mr-[0.25em] font-normal tracking-normal text-muted-foreground" style={{ fontSize: "0.5em" }}>
                Rp
              </span>
              <span>
                {negative ? "−" : ""}
                {digits}
              </span>
            </p>

            {monthChange ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium",
                    monthTone === "positive" && "bg-positive/15 text-positive",
                    monthTone === "negative" && "bg-negative/15 text-negative",
                    monthTone === "neutral" && "bg-muted text-muted-foreground"
                  )}
                >
                  <MonthIcon className="h-3.5 w-3.5" aria-hidden />
                  <span className="tabular">{signedCurrency(monthChange.amount)}</span>
                  {monthChange.percent !== null && !narrow ? (
                    <span className="tabular font-normal opacity-80">{signedPercent(monthChange.percent)}</span>
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">bulan ini</span>
              </div>
            ) : null}
          </div>

          {showTiles ? (
            <div className={cn("space-y-3", tilesBeside ? "w-[19.5rem] shrink-0" : "w-full")}>
              <div className="grid grid-cols-2 gap-3">
                <FlowTile label="Pemasukan" value={income} tone="positive" onImage={onImage} />
                <FlowTile label="Pengeluaran" value={expense} tone="negative" onImage={onImage} />
              </div>
              {showMarks ? (
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
          ) : null}
        </div>

        {/* Keterangan grafik: berganti saat kursor / jari menyentuh grafik */}
        {chart && tall ? (
          <div className="mt-4 flex h-5 items-baseline justify-between gap-3 text-xs" aria-live="off">
            {hovered ? (
              <>
                <span className="text-muted-foreground">{formatDay(hovered.date)}</span>
                <span className="tabular font-medium">{formatCurrency(hovered.value)}</span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">{period.label}</span>
                {periodDelta !== null ? (
                  <span
                    className={cn(
                      "tabular font-medium",
                      periodDelta > 0 && "text-positive",
                      periodDelta < 0 && "text-negative",
                      periodDelta === 0 && "text-muted-foreground"
                    )}
                  >
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

      {/* Grafik: penuh sampai tepi kartu. Kartu pendek → hanya lengkung tipis di dasar. */}
      {chart && endPoint ? (
        <div
          role="img"
          aria-label={chartLabel}
          className={cn(
            "relative select-none",
            tall ? "mt-1 min-h-[88px] flex-1 cursor-crosshair" : "pointer-events-none absolute inset-x-0 bottom-0 h-[46%] opacity-80"
          )}
          style={{ touchAction: "pan-y" }}
          onPointerMove={tall ? onPointer : undefined}
          onPointerDown={tall ? onPointer : undefined}
          onPointerLeave={tall ? () => setHover(null) : undefined}
          onPointerCancel={tall ? () => setHover(null) : undefined}
        >
          <svg
            key={periodKey}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="chart-reveal absolute inset-0 h-full w-full text-primary"
            aria-hidden
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity={onImage ? 0.4 : 0.3} />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={chart.area} fill={`url(#${gradientId})`} />
            {tall ? (
              <line
                x1={0}
                x2={W}
                y1={startY}
                y2={startY}
                stroke="currentColor"
                strokeOpacity={0.28}
                strokeDasharray="3 6"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            <path
              d={chart.line}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {hoveredPoint ? (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary opacity-30"
                style={{ left: `${(hoveredPoint.x / W) * 100}%` }}
              />
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4",
                  onImage ? "ring-black/30" : "ring-card"
                )}
                style={{ left: `${(hoveredPoint.x / W) * 100}%`, top: `${(hoveredPoint.y / H) * 100}%` }}
              />
            </>
          ) : (
            <span
              aria-hidden
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(endPoint.x / W) * 100}%`, top: `${(endPoint.y / H) * 100}%` }}
            >
              <span className="dot-ping absolute inset-0 rounded-full bg-primary" />
              <span
                className={cn("relative block h-2.5 w-2.5 rounded-full bg-primary ring-[3px]", onImage ? "ring-black/30" : "ring-card")}
              />
            </span>
          )}
        </div>
      ) : (
        <div className="mt-2 flex min-h-[64px] flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          {accounts.length === 0
            ? "Tambah akun untuk mulai melihat riwayat saldo."
            : "Grafik muncul setelah saldo tercatat dalam beberapa hari."}
        </div>
      )}
    </section>
  );
}
