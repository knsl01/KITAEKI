"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { Sparkline, type SparklineTone } from "@/components/charts/sparkline";
import { useWidgetBox, WidgetFrame } from "@/components/dashboard/widget-frame";
import { useCountUp } from "@/hooks/use-count-up";
import { fitFontSize } from "@/lib/chart-utils";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type StatKind = "income" | "expense" | "net";

export type StatSeriesPoint = { label: string; value: number };

const META: Record<
  StatKind,
  { icon: typeof ArrowDownLeft; tone: SparklineTone; tile: string; goodWhenUp: boolean }
> = {
  income: { icon: ArrowDownLeft, tone: "positive", tile: "bg-positive/10 text-positive", goodWhenUp: true },
  expense: { icon: ArrowUpRight, tone: "negative", tile: "bg-negative/10 text-negative", goodWhenUp: false },
  net: { icon: PiggyBank, tone: "primary", tile: "bg-primary/10 text-primary", goodWhenUp: true },
};

function SavingsRing({ rate }: { rate: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, rate));
  const negative = rate < 0;

  return (
    <div className="relative h-[68px] w-[68px] shrink-0" role="img" aria-label={`${rate}% dari pemasukan ditabung`}>
      <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="34" cy="34" r={r} fill="none" strokeWidth="6" className="stroke-muted" />
        <circle
          cx="34"
          cy="34"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={cn("ring-fill", negative ? "stroke-negative" : "stroke-primary")}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          style={{ "--ring-c": c } as React.CSSProperties}
        />
      </svg>
      <span className="tabular absolute inset-0 flex items-center justify-center text-[13px] font-medium">{rate}%</span>
    </div>
  );
}

/**
 * Widget angka bulan ini (pemasukan / pengeluaran / tabungan).
 * `series` = enam bulan terakhir, bulan ini di ujung kanan. Sentuh grafik kecilnya
 * untuk melihat bulan lain tanpa pindah halaman.
 */
export function StatWidget({
  kind,
  title,
  series,
  changePercent,
  hint,
  rate,
}: {
  kind: StatKind;
  title: string;
  series: StatSeriesPoint[];
  /** Perubahan dibanding bulan lalu dalam persen; null kalau bulan lalu kosong. */
  changePercent: number | null;
  hint?: string;
  /** Persentase tabungan dari pemasukan (hanya untuk kind="net"). */
  rate?: number;
}) {
  const box = useWidgetBox();
  const meta = META[kind];
  const Icon = meta.icon;
  const [active, setActive] = useState<number | null>(null);

  const values = series.map((p) => p.value);
  const current = values.length ? values[values.length - 1] : 0;
  const counted = useCountUp(current);
  const shown = active !== null ? values[active] : counted;

  const showRing = kind === "net" && typeof rate === "number" && box.width >= 300 && box.height >= 170;
  const text = formatCurrency(shown);
  const numberSize = fitFontSize(text.length, box.width - 40 - (showRing ? 84 : 0), box.width >= 420 ? 36 : 30, 17);

  const up = (changePercent ?? 0) >= 0;
  const good = up === meta.goodWhenUp;
  const TrendIcon = up ? TrendingUp : TrendingDown;

  return (
    <WidgetFrame
      title={title}
      action={
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", meta.tile)} aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
      }
      bodyClassName="flex flex-col !px-0 !pb-0"
    >
      <div className="flex items-center justify-between gap-3 px-5">
        <div className="min-w-0">
          <p
            className={cn(
              "numeral whitespace-nowrap font-medium leading-none tracking-[-0.03em]",
              kind === "expense" && "text-negative",
              kind === "income" && "text-positive"
            )}
            style={{ fontSize: numberSize }}
          >
            {text}
          </p>

          <p className="mt-2.5 flex h-6 items-center gap-2 text-xs text-muted-foreground">
            {active !== null ? (
              <span className="tabular">{series[active]?.label}</span>
            ) : changePercent !== null ? (
              <>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                    good ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                  )}
                >
                  <TrendIcon className="h-3 w-3" aria-hidden />
                  <span className="tabular">{Math.abs(changePercent)}%</span>
                </span>
                <span className="truncate">dari bulan lalu</span>
              </>
            ) : (
              <span className="truncate">{hint ?? "Belum ada pembanding bulan lalu"}</span>
            )}
          </p>
        </div>

        {showRing ? <SavingsRing rate={rate ?? 0} /> : null}
      </div>

      <Sparkline
        values={values}
        tone={meta.tone}
        active={active}
        onActiveChange={setActive}
        ariaLabel={`${title} ${series.length} bulan terakhir`}
        className="mt-2 min-h-[44px] flex-1"
      />
    </WidgetFrame>
  );
}
