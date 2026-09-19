"use client";

import Link from "next/link";
import { createContext, useContext } from "react";
import { ArrowUpRight } from "lucide-react";
import { approxWidgetSize, type WidgetRows, type WidgetSpan } from "@/lib/widgets";
import { cn } from "@/lib/utils";

/* ── Ukuran widget ──────────────────────────────────────────
   Papan mengukur tiap widget dengan ResizeObserver dan membagikannya lewat konteks,
   supaya isi widget menyesuaikan diri (jumlah baris, tata letak) — bukan sekadar
   memotong isi yang kepanjangan. */

export type WidgetBox = {
  width: number;
  height: number;
  editing: boolean;
  span: WidgetSpan;
  rows: WidgetRows;
};

const initial = approxWidgetSize("md", 2);

export const WidgetBoxContext = createContext<WidgetBox>({
  ...initial,
  editing: false,
  span: "md",
  rows: 2,
});

export function useWidgetBox() {
  return useContext(WidgetBoxContext);
}

/** Tinggi yang tersisa untuk isi widget, setelah judul dan padding. */
export const FRAME_CHROME_PX = 60;

/** Berapa baris daftar setinggi `rowPx` yang muat di widget ini. */
export function fitRows(height: number, rowPx: number, reserve = 0) {
  return Math.max(1, Math.floor((height - FRAME_CHROME_PX - reserve) / rowPx));
}

/* ── Kerangka ────────────────────────────────────────────── */

export function WidgetFrame({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section aria-label={title} className={cn("widget-card flex h-full min-h-0 flex-col", className)}>
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-5 pt-1">
        <h3 className="truncate font-serif text-[1.0625rem] leading-6 tracking-tight">{title}</h3>
        {action}
      </header>
      <div className={cn("min-h-0 flex-1 px-5 pb-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function FrameLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="icon-slide flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}
