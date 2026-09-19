"use client";

import { useState } from "react";
import { useWidgetBox, WidgetFrame } from "@/components/dashboard/widget-frame";
import { useElementSize } from "@/hooks/use-element-size";
import { clamp, compactNumber, niceScale, topRoundedRect } from "@/lib/chart-utils";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type FlowPoint = { label: string; fullLabel: string; income: number; expense: number };

type SeriesKey = "income" | "expense";

const SERIES: { key: SeriesKey; label: string; color: string; dot: string }[] = [
  { key: "income", label: "Pemasukan", color: "var(--chart-income)", dot: "bg-[var(--chart-income)]" },
  { key: "expense", label: "Pengeluaran", color: "var(--chart-expense)", dot: "bg-[var(--chart-expense)]" },
];

const PAD = { left: 42, right: 6, top: 10, bottom: 24 };

function Legend({
  hidden,
  onToggle,
  dotsOnly,
}: {
  hidden: Record<SeriesKey, boolean>;
  onToggle: (key: SeriesKey) => void;
  /** Layar sempit: hanya titik warna, nama dibaca pembaca layar. */
  dotsOnly: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {SERIES.map((s) => (
        <button
          key={s.key}
          type="button"
          aria-pressed={!hidden[s.key]}
          onClick={() => onToggle(s.key)}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-full text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dotsOnly ? "w-7 justify-center" : "px-2.5",
            hidden[s.key] ? "text-muted-foreground/60 hover:bg-muted" : "bg-muted text-foreground"
          )}
        >
          <span className={cn("h-2 w-2 rounded-full transition-opacity", s.dot, hidden[s.key] && "opacity-30")} />
          <span className={cn(hidden[s.key] && "line-through", dotsOnly && "sr-only")}>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Batang pemasukan dan pengeluaran per bulan, digambar langsung sebagai SVG
 * seukuran widget. Arahkan kursor / sentuh satu bulan untuk melihat angkanya;
 * klik legenda untuk menyembunyikan salah satu seri.
 */
export function FlowWidget({ data }: { data: FlowPoint[] }) {
  const box = useWidgetBox();
  const [hidden, setHidden] = useState<Record<SeriesKey, boolean>>({ income: false, expense: false });
  const [hover, setHover] = useState<number | null>(null);
  const [ref, size] = useElementSize<HTMLDivElement>({
    width: Math.max(0, box.width - 40),
    height: Math.max(120, box.height - 128),
  });

  function toggle(key: SeriesKey) {
    setHidden((prev) => {
      const other: SeriesKey = key === "income" ? "expense" : "income";
      if (!prev[key] && prev[other]) return prev; // minimal satu seri tetap tampil
      return { ...prev, [key]: !prev[key] };
    });
    setHover(null);
  }

  const visible = SERIES.filter((s) => !hidden[s.key]);
  const n = data.length;
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  const maxValue = Math.max(0, ...data.flatMap((d) => visible.map((s) => d[s.key])));
  const scale = niceScale(maxValue, size.height < 170 ? 3 : 4);

  const W = size.width;
  const H = size.height;
  const innerW = Math.max(0, W - PAD.left - PAD.right);
  const innerH = Math.max(0, H - PAD.top - PAD.bottom);
  const groupW = n > 0 ? innerW / n : 0;
  const barW = clamp(groupW * 0.26, 8, 28);
  const barGap = 4;
  const groupBars = visible.length * barW + (visible.length - 1) * barGap;

  const yOf = (v: number) => PAD.top + innerH - (v / scale.max) * innerH;

  const totals = data.reduce(
    (acc, d) => ({ income: acc.income + d.income, expense: acc.expense + d.expense }),
    { income: 0, expense: 0 }
  );
  const focus = hover !== null ? data[hover] : null;
  const shown = focus ?? { ...totals, fullLabel: `${n} bulan terakhir` };
  const net = shown.income - shown.expense;

  function onPointer(event: React.PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || n === 0) return;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 0.9999);
    setHover(Math.floor(ratio * n));
  }

  return (
    <WidgetFrame title="Pemasukan vs pengeluaran" action={<Legend hidden={hidden} onToggle={toggle} dotsOnly={box.width < 420} />}>
      <div className="flex h-full min-h-0 flex-col">
        {/* Ringkasan: berganti mengikuti bulan yang disentuh */}
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {shown.fullLabel}
          </p>
          <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            {SERIES.map((s) =>
              hidden[s.key] ? null : (
                <div key={s.key} className="flex items-baseline gap-1.5">
                  <dt className="sr-only">{s.label}</dt>
                  <span className={cn("h-2 w-2 translate-y-[-1px] rounded-full", s.dot)} aria-hidden />
                  <dd className="tabular text-sm font-semibold">{formatCurrency(shown[s.key])}</dd>
                </div>
              )
            )}
            {!hidden.income && !hidden.expense && box.width >= 460 ? (
              <div className="flex items-baseline gap-1.5 text-xs text-muted-foreground">
                <dt>Selisih</dt>
                <dd className={cn("tabular font-semibold", net >= 0 ? "text-positive" : "text-negative")}>
                  {net >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(net))}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div ref={ref} className="relative mt-2 min-h-[110px] flex-1">
          {hasData && W > 0 && H > 0 ? (
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 overflow-visible" role="img" aria-label={`Grafik batang pemasukan dan pengeluaran ${n} bulan terakhir`}>
              <defs>
                {SERIES.map((s) => (
                  <linearGradient key={s.key} id={`flow-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={s.color} stopOpacity="1" />
                    <stop offset="1" stopColor={s.color} stopOpacity="0.62" />
                  </linearGradient>
                ))}
              </defs>

              {/* garis bantu */}
              {scale.ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={yOf(t)}
                    y2={yOf(t)}
                    stroke="var(--chart-grid)"
                    strokeDasharray={t === 0 ? undefined : "2 5"}
                    strokeWidth={1}
                  />
                  <text x={PAD.left - 8} y={yOf(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={10.5}>
                    {compactNumber(t)}
                  </text>
                </g>
              ))}

              {/* sorotan bulan */}
              {hover !== null ? (
                <rect
                  x={PAD.left + hover * groupW + 3}
                  y={PAD.top - 4}
                  width={Math.max(0, groupW - 6)}
                  height={innerH + 4}
                  rx={10}
                  className="fill-muted"
                  opacity={0.75}
                />
              ) : null}

              {/* batang */}
              {data.map((d, i) => {
                const start = PAD.left + i * groupW + (groupW - groupBars) / 2;
                return visible.map((s, j) => {
                  const value = d[s.key];
                  const h = (value / scale.max) * innerH;
                  const x = start + j * (barW + barGap);
                  const dim = hover !== null && hover !== i;
                  return (
                    <path
                      key={`${s.key}-${i}-${visible.length}`}
                      d={topRoundedRect(x, yOf(value), barW, Math.max(h, value > 0 ? 2 : 0), Math.min(7, barW / 2))}
                      fill={`url(#flow-${s.key})`}
                      className="bar-grow"
                      style={{ "--i": i * 2 + j, opacity: dim ? 0.4 : 1, transition: "opacity .18s ease" } as React.CSSProperties}
                    />
                  );
                });
              })}

              {/* label bulan */}
              {data.map((d, i) => (
                <text
                  key={d.label}
                  x={PAD.left + i * groupW + groupW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize={11}
                  className={cn(hover === i ? "fill-foreground font-medium" : "fill-muted-foreground")}
                >
                  {d.label}
                </text>
              ))}

              {/* area sentuh */}
              <rect
                x={PAD.left}
                y={0}
                width={innerW}
                height={H}
                fill="transparent"
                style={{ touchAction: "pan-y", cursor: "crosshair" }}
                onPointerMove={onPointer}
                onPointerDown={onPointer}
                onPointerLeave={() => setHover(null)}
                onPointerCancel={() => setHover(null)}
              />
            </svg>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              {hasData ? null : "Grafik muncul setelah ada pemasukan atau pengeluaran."}
            </div>
          )}

          <table className="sr-only">
            <caption>Pemasukan dan pengeluaran per bulan</caption>
            <thead>
              <tr>
                <th>Bulan</th>
                <th>Pemasukan</th>
                <th>Pengeluaran</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.fullLabel}>
                  <td>{d.fullLabel}</td>
                  <td>{formatCurrency(d.income)}</td>
                  <td>{formatCurrency(d.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WidgetFrame>
  );
}
