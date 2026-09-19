"use client";

import { useId } from "react";
import { monotonePath } from "@/lib/chart-utils";
import { cn } from "@/lib/utils";

export type SparklineTone = "primary" | "positive" | "negative";

const TONE_TEXT: Record<SparklineTone, string> = {
  primary: "text-primary",
  positive: "text-positive",
  negative: "text-negative",
};

const W = 100;
const H = 40;
const PAD_Y = 5;
/** Ruang di kanan supaya titik terakhir tidak terpotong tepi kartu. */
const PAD_RIGHT = 6;

/**
 * Garis kecil tanpa sumbu. Diregangkan penuh oleh SVG (garis tetap tipis),
 * titik aktif digambar sebagai elemen HTML supaya tetap bulat.
 * Sentuh atau arahkan kursor untuk memilih satu titik.
 */
export function Sparkline({
  values,
  tone = "primary",
  active,
  onActiveChange,
  ariaLabel,
  className,
}: {
  values: number[];
  tone?: SparklineTone;
  active: number | null;
  onActiveChange?: (index: number | null) => void;
  ariaLabel: string;
  className?: string;
}) {
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const n = values.length;

  if (n < 2) {
    return (
      <div className={cn("flex items-end", className)} aria-hidden>
        <div className="h-px w-full bg-border" />
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const points = values.map((v, i) => ({
    x: (i / (n - 1)) * (W - PAD_RIGHT),
    y: span === 0 ? H / 2 : PAD_Y + (1 - (v - min) / span) * (H - PAD_Y * 2),
  }));

  const line = monotonePath(points);
  const area = `${line} L${W},${points[n - 1].y} L${W},${H} L0,${H} Z`;
  const focus = active !== null ? points[active] : points[n - 1];

  function onPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (!onActiveChange) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onActiveChange(Math.round(ratio * (n - 1)));
  }

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("relative select-none", TONE_TEXT[tone], onActiveChange && "cursor-crosshair", className)}
      style={{ touchAction: "pan-y" }}
      onPointerMove={onPointer}
      onPointerDown={onPointer}
      onPointerLeave={() => onActiveChange?.(null)}
      onPointerCancel={() => onActiveChange?.(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart-reveal absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.26" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {active !== null ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-current opacity-20"
          style={{ left: `${(focus.x / W) * 100}%` }}
        />
      ) : null}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-[3px] ring-card transition-[width,height] duration-150",
          active !== null ? "h-3 w-3" : "h-2.5 w-2.5"
        )}
        style={{ left: `${(focus.x / W) * 100}%`, top: `${(focus.y / H) * 100}%` }}
      />
    </div>
  );
}
