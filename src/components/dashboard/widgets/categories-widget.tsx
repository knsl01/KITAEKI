"use client";

import { useState } from "react";
import { FRAME_CHROME_PX, useWidgetBox, WidgetFrame } from "@/components/dashboard/widget-frame";
import { clamp } from "@/lib/chart-utils";
import { formatCurrency, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CategorySlice = { name: string; value: number; color: string };

const R = 76;
const C = 2 * Math.PI * R;

function Donut({
  data,
  total,
  size,
  active,
  onActive,
  monthLabel,
}: {
  data: CategorySlice[];
  total: number;
  size: number;
  active: number | null;
  onActive: (i: number | null) => void;
  monthLabel: string;
}) {
  const gap = data.length > 1 ? 3 : 0;
  let cumulative = 0;
  const focus = active !== null ? data[active] : null;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90 overflow-visible" role="img" aria-label={`Pengeluaran ${monthLabel} menurut kategori`}>
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth={22} className="stroke-muted" />
        {data.map((slice, i) => {
          const len = (slice.value / total) * C;
          const dash = Math.max(0.5, len - gap);
          const offset = -cumulative;
          cumulative += len;
          const isActive = active === i;
          return (
            <circle
              key={slice.name}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={slice.color}
              strokeWidth={isActive ? 28 : 22}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={offset}
              className="donut-slice cursor-pointer"
              style={{ opacity: active !== null && !isActive ? 0.35 : 1 }}
              onPointerEnter={() => onActive(i)}
              onPointerLeave={() => onActive(null)}
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[18%] text-center">
        <span className="max-w-full truncate text-xs text-muted-foreground">{focus ? focus.name : "Total"}</span>
        <span className="numeral tabular mt-0.5 max-w-full truncate font-medium leading-tight" style={{ fontSize: clamp(size / 10, 12, 18) }}>
          {formatCurrency(focus ? focus.value : total)}
        </span>
        {focus ? <span className="tabular mt-0.5 text-xs text-muted-foreground">{percent(focus.value, total)}%</span> : null}
      </div>
    </div>
  );
}

export function CategoriesWidget({ data, monthLabel }: { data: CategorySlice[]; monthLabel: string }) {
  const box = useWidgetBox();
  const [active, setActive] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const current = pinned ?? active;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const availH = box.height - FRAME_CHROME_PX;
  const sideBySide = box.width >= 440 && availH >= 150;

  const donutSize = sideBySide ? clamp(availH - 4, 120, 220) : clamp(Math.min(availH - 8, box.width - 60, 168), 96, 168);
  const legendRowPx = 34;
  const legendSpace = sideBySide ? availH : availH - donutSize - 12;
  let legendRows = Math.max(sideBySide ? 1 : 0, Math.floor(legendSpace / legendRowPx));
  // Baris "+N kategori lain" butuh tempat sendiri
  if (data.length > legendRows && legendRows > 0) {
    legendRows = Math.max(1, Math.floor((legendSpace - 24) / legendRowPx));
  }
  const legend = data.slice(0, legendRows);
  const hiddenCount = data.length - legend.length;

  return (
    <WidgetFrame title="Pengeluaran per kategori" action={<span className="truncate text-xs text-muted-foreground">{monthLabel}</span>}>
      {data.length === 0 || total <= 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
          <p className="font-serif text-base">Belum ada pengeluaran bulan ini</p>
          <p className="max-w-[16rem] text-sm text-muted-foreground">Catat transaksi pertama kalian untuk melihat pembagiannya.</p>
        </div>
      ) : (
        <div className={cn("flex h-full min-h-0 gap-5", sideBySide ? "flex-row items-center" : "flex-col items-center")}>
          <Donut data={data} total={total} size={donutSize} active={current} onActive={setActive} monthLabel={monthLabel} />

          {legend.length > 0 ? (
            <ul className="w-full min-w-0 flex-1 space-y-0.5">
              {legend.map((slice, i) => {
                const on = current === i;
                return (
                  <li key={slice.name}>
                    <button
                      type="button"
                      aria-pressed={pinned === i}
                      onClick={() => setPinned(pinned === i ? null : i)}
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      className={cn(
                        "flex h-8 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        on ? "bg-muted" : "hover:bg-muted/60"
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-200"
                        style={{ backgroundColor: slice.color, transform: on ? "scale(1.5)" : undefined }}
                      />
                      <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                      {box.width >= 380 ? <span className="tabular hidden text-xs text-muted-foreground sm:block">{formatCurrency(slice.value)}</span> : null}
                      <span className="tabular w-9 shrink-0 text-right text-xs text-muted-foreground">{percent(slice.value, total)}%</span>
                    </button>
                  </li>
                );
              })}
              {hiddenCount > 0 ? <li className="px-2 pt-1 text-xs text-muted-foreground">+{hiddenCount} kategori lain</li> : null}
            </ul>
          ) : null}
        </div>
      )}
    </WidgetFrame>
  );
}
