"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ClipboardList,
  Gift,
  GripVertical,
  Landmark,
  ListChecks,
  Loader2,
  PieChart,
  PiggyBank,
  Plus,
  RotateCcw,
  ShoppingCart,
  Target,
  Wallet,
  Bot,
  MapPinned,
  Heart,
  Repeat,
  Receipt,
  Tags,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { saveDashboardLayout } from "@/app/actions/dashboard";
import { useDashboardEdit } from "@/components/dashboard/edit-context";
import { WidgetBoxContext, type WidgetBox } from "@/components/dashboard/widget-frame";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useElementSize, useIsoLayoutEffect } from "@/hooks/use-element-size";
import {
  approxWidgetSize,
  defaultLayout,
  GRID_GAP_PX,
  hiddenWidgets,
  hideWidget,
  layoutsEqual,
  moveVisible,
  nearestRows,
  nearestSpan,
  nudgeVisible,
  resizeWidget,
  ROW_HEIGHT_PX,
  showWidget,
  SPAN_LABEL,
  SPAN_NAME,
  visibleWidgets,
  WIDGETS,
  type WidgetKey,
  type WidgetRows,
  type WidgetSpan,
  type WidgetState,
} from "@/lib/widgets";
import { cn } from "@/lib/utils";

// `page-budget` is retained here as a compatibility icon for old generated
// widget types/layouts, while the current registry no longer exposes that page.
const ICONS: Record<WidgetKey, LucideIcon> & Partial<Record<"page-budget", LucideIcon>> = {
  balance: Wallet,
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  net: PiggyBank,
  flow: BarChart3,
  accounts: Landmark,
  categories: PieChart,
  goals: Target,
  tasks: ListChecks,
  recent: ArrowLeftRight,
  shopping: ShoppingCart,
  wishlist: Gift,
  "page-ai": Bot,
  "page-transactions": ArrowLeftRight,
  "page-accounts": Landmark,
  "page-finance": Receipt,
  "page-savings": PiggyBank,
  "page-recurring": Repeat,
  "page-calendar": ListChecks,
  "page-routes": MapPinned,
  "page-shopping": ShoppingCart,
  "page-budget": ClipboardList,
  "page-categories": Tags,
  "page-wishlist": Heart,
  "page-share": Target,
  "page-settings": Settings,
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ── Kontrol ukuran ─────────────────────────────────────── */

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  showLabel,
}: {
  label: string;
  options: { value: T; text: string; name: string }[];
  value: T;
  onChange: (value: T) => void;
  showLabel: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center justify-center gap-2" data-no-drag>
      {showLabel ? <span className="w-11 text-right text-[11px] text-muted-foreground">{label}</span> : null}
      <div className="flex rounded-full border border-border bg-card p-0.5 shadow-sm">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${label}: ${option.name}`}
              onClick={() => onChange(option.value)}
              className={cn(
                "h-7 min-w-[1.75rem] rounded-full px-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {option.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EditOverlay({
  state,
  width,
  onSpan,
  onRows,
  onHide,
  onGripPointerDown,
  onGripKeyDown,
  onOverlayPointerDown,
  onResizePointerDown,
}: {
  state: WidgetState;
  width: number;
  onSpan: (span: WidgetSpan) => void;
  onRows: (rows: WidgetRows) => void;
  onHide: () => void;
  onGripPointerDown: (event: React.PointerEvent) => void;
  onGripKeyDown: (event: React.KeyboardEvent) => void;
  onOverlayPointerDown: (event: React.PointerEvent) => void;
  onResizePointerDown: (event: React.PointerEvent) => void;
}) {
  const def = WIDGETS[state.key];
  const showLabel = width >= 330;

  return (
    <div
      onPointerDown={onOverlayPointerDown}
      className="edit-overlay absolute inset-0 z-20 flex cursor-grab flex-col items-center justify-center gap-2 rounded-[inherit] border-2 border-dashed border-primary/45 bg-background/70 p-3 backdrop-blur-[2px]"
    >
      <button
        type="button"
        data-grip={state.key}
        aria-label={`Geser ${def.title}. Tombol panah memindahkan satu langkah.`}
        onPointerDown={onGripPointerDown}
        onKeyDown={onGripKeyDown}
        className="absolute left-2 top-2 flex h-8 cursor-grab touch-none items-center gap-1 rounded-full border border-border bg-card pl-1.5 pr-2.5 text-xs shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
        Geser
      </button>

      <button
        type="button"
        data-no-drag
        aria-label={`Sembunyikan ${def.title}`}
        onClick={onHide}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-negative/10 hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <p className="mt-6 max-w-full truncate px-8 font-serif text-base leading-tight tracking-tight">{def.title}</p>

      <div className="flex flex-col gap-1.5">
        <Segmented
          label="Lebar"
          showLabel={showLabel}
          value={state.span}
          onChange={onSpan}
          options={def.spans.map((s) => ({ value: s, text: SPAN_LABEL[s], name: SPAN_NAME[s] }))}
        />
        {def.rows.length > 1 ? (
          <Segmented
            label="Tinggi"
            showLabel={showLabel}
            value={state.rows}
            onChange={onRows}
            options={def.rows.map((r) => ({ value: r, text: String(r), name: `${r} baris` }))}
          />
        ) : null}
      </div>

      <button
        type="button"
        data-no-drag
        aria-label={`Tarik untuk mengubah ukuran ${def.title}`}
        onPointerDown={onResizePointerDown}
        className="absolute bottom-1.5 right-1.5 flex h-8 w-8 cursor-nwse-resize touch-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
          <path d="M14 6 6 14M14 10l-4 4" />
        </svg>
      </button>
    </div>
  );
}

/* ── Satu widget di papan ───────────────────────────────── */

function WidgetSlot({
  state,
  index,
  editing,
  dragging,
  register,
  children,
  overlay,
}: {
  state: WidgetState;
  index: number;
  editing: boolean;
  dragging: boolean;
  register: (key: WidgetKey, el: HTMLDivElement | null) => void;
  children: React.ReactNode;
  overlay: (width: number) => React.ReactNode;
}) {
  const [sizeRef, size] = useElementSize<HTMLDivElement>(approxWidgetSize(state.span, state.rows));

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      sizeRef.current = el;
      register(state.key, el);
    },
    [register, sizeRef, state.key]
  );

  const box = useMemo<WidgetBox>(
    () => ({ width: size.width, height: size.height, editing, span: state.span, rows: state.rows }),
    [size.width, size.height, editing, state.span, state.rows]
  );

  return (
    <div
      ref={setRef}
      data-widget-key={state.key}
      data-span={state.span}
      data-rows={state.rows}
      data-editing={editing || undefined}
      data-dragging={dragging || undefined}
      className="widget-slot"
      style={{ "--i": Math.min(index, 8) } as React.CSSProperties}
    >
      <WidgetBoxContext.Provider value={box}>
        <div className={cn("h-full", editing && "pointer-events-none select-none")} aria-hidden={editing || undefined}>
          {children}
        </div>
      </WidgetBoxContext.Provider>
      {editing ? overlay(size.width) : null}
    </div>
  );
}

function WidgetPlaceholder() {
  return (
    <div className="widget-card flex h-full flex-col gap-3 p-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-auto h-16 w-full" />
    </div>
  );
}

/* ── Papan ──────────────────────────────────────────────── */

type DragState = {
  key: WidgetKey;
  pointerId: number;
  grabX: number;
  grabY: number;
  px: number;
  py: number;
  lastTarget: WidgetKey | null;
  raf: number;
};

export function WidgetBoard({
  initial,
  nodes,
}: {
  initial: WidgetState[];
  nodes: Partial<Record<WidgetKey, React.ReactNode>>;
}) {
  const router = useRouter();
  const { editing, setEditing } = useDashboardEdit();

  const [layout, setLayout] = useState<WidgetState[]>(initial);
  const [baseline, setBaseline] = useState<WidgetState[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [trayOpen, setTrayOpen] = useState(true);
  const [dragKey, setDragKey] = useState<WidgetKey | null>(null);
  const [pending, startTransition] = useTransition();

  const gridRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef(new Map<WidgetKey, HTMLDivElement>());
  const prevPositions = useRef(new Map<WidgetKey, { x: number; y: number }>());
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<{ key: WidgetKey; pointerId: number } | null>(null);
  // Pendengar yang sedang terpasang di window, supaya bisa dilepas dari render mana pun.
  const listeners = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | null>(null);
  const layoutRef = useRef(layout);
  const focusGripRef = useRef<WidgetKey | null>(null);
  layoutRef.current = layout;

  // Sinkron dengan server (mis. setelah router.refresh) selama tidak sedang mengatur.
  const initialSignature = JSON.stringify(initial);
  useEffect(() => {
    if (editing) return;
    setLayout(initial);
    setBaseline(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSignature, editing]);

  const visible = useMemo(() => visibleWidgets(layout), [layout]);
  const hidden = useMemo(() => hiddenWidgets(layout), [layout]);
  const dirty = !layoutsEqual(layout, baseline);

  const register = useCallback((key: WidgetKey, el: HTMLDivElement | null) => {
    if (el) slotRefs.current.set(key, el);
    else slotRefs.current.delete(key);
  }, []);

  /* ── FLIP: widget lain meluncur ke tempat barunya ── */
  const snapshot = useCallback(() => {
    const next = new Map<WidgetKey, { x: number; y: number }>();
    slotRefs.current.forEach((el, key) => next.set(key, { x: el.offsetLeft, y: el.offsetTop }));
    return next;
  }, []);

  useIsoLayoutEffect(() => {
    const next = snapshot();
    if (!prefersReducedMotion()) {
      next.forEach((pos, key) => {
        const prev = prevPositions.current.get(key);
        const el = slotRefs.current.get(key);
        if (!prev || !el || dragRef.current?.key === key) return;
        const dx = prev.x - pos.x;
        const dy = prev.y - pos.y;
        if (dx === 0 && dy === 0) return;
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 260, easing: EASE });
      });
    }
    prevPositions.current = next;

    if (dragRef.current) applyDragTransform();

    if (focusGripRef.current) {
      const grip = gridRef.current?.querySelector<HTMLElement>(`[data-grip="${focusGripRef.current}"]`);
      grip?.focus();
      focusGripRef.current = null;
    }
  });

  // Ukuran jendela berubah: perbarui posisi acuan tanpa animasi.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (!dragRef.current) prevPositions.current = snapshot();
    });
    observer.observe(grid);
    return () => observer.disconnect();
  }, [snapshot]);

  /* ── Geser dengan pointer ── */
  function applyDragTransform() {
    const d = dragRef.current;
    const grid = gridRef.current;
    const el = d ? slotRefs.current.get(d.key) : null;
    if (!d || !grid || !el) return;
    const gr = grid.getBoundingClientRect();
    const left = d.px - gr.left - d.grabX;
    const top = d.py - gr.top - d.grabY;
    el.style.transform = `translate(${left - el.offsetLeft}px, ${top - el.offsetTop}px)`;
  }

  function updateDrag() {
    const d = dragRef.current;
    if (!d) return;
    applyDragTransform();

    const keys = visibleWidgets(layoutRef.current).map((w) => w.key);
    let target: WidgetKey | null = null;
    for (const key of keys) {
      if (key === d.key) continue;
      const rect = slotRefs.current.get(key)?.getBoundingClientRect();
      if (rect && d.px >= rect.left && d.px <= rect.right && d.py >= rect.top && d.py <= rect.bottom) {
        target = key;
        break;
      }
    }

    // Satu tukar per masuk ke widget lain: tidak bolak-balik saat kursor diam.
    if (target !== d.lastTarget) {
      d.lastTarget = target;
      if (target) {
        const index = keys.indexOf(target);
        setLayout((current) => moveVisible(current, d.key, index));
      }
    }
  }

  function onDragMove(event: PointerEvent) {
    const d = dragRef.current;
    if (!d || event.pointerId !== d.pointerId) return;
    d.px = event.clientX;
    d.py = event.clientY;
    updateDrag();
  }

  function scrollLoop() {
    const d = dragRef.current;
    if (!d) return;
    const edge = 96;
    let dy = 0;
    if (d.py < edge) dy = -Math.ceil((edge - d.py) / 5);
    else if (d.py > window.innerHeight - edge) dy = Math.ceil((d.py - (window.innerHeight - edge)) / 5);
    if (dy !== 0) {
      window.scrollBy(0, dy);
      updateDrag();
    }
    d.raf = requestAnimationFrame(scrollLoop);
  }

  function endDrag() {
    const d = dragRef.current;
    if (!d) return;
    cancelAnimationFrame(d.raf);
    detachListeners();

    const el = slotRefs.current.get(d.key);
    if (el) {
      const from = el.style.transform;
      el.style.transform = "";
      if (from && !prefersReducedMotion()) {
        el.animate([{ transform: from }, { transform: "none" }], { duration: 240, easing: EASE });
      }
    }
    dragRef.current = null;
    setDragKey(null);
  }

  function detachListeners() {
    const l = listeners.current;
    if (l) {
      window.removeEventListener("pointermove", l.move);
      window.removeEventListener("pointerup", l.up);
      window.removeEventListener("pointercancel", l.up);
      listeners.current = null;
    }
    document.body.style.userSelect = "";
  }

  function attachListeners(move: (e: PointerEvent) => void, up: (e: PointerEvent) => void) {
    detachListeners();
    listeners.current = { move, up };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function endDragEvent(event: PointerEvent) {
    if (dragRef.current && event.pointerId === dragRef.current.pointerId) endDrag();
  }

  function startDrag(key: WidgetKey, event: React.PointerEvent) {
    if (dragRef.current) return;
    const el = slotRefs.current.get(key);
    if (!el) return;
    event.preventDefault();

    const rect = el.getBoundingClientRect();
    dragRef.current = {
      key,
      pointerId: event.pointerId,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      px: event.clientX,
      py: event.clientY,
      lastTarget: null,
      raf: 0,
    };
    attachListeners(onDragMove, endDragEvent);
    dragRef.current.raf = requestAnimationFrame(scrollLoop);
    setDragKey(key);
  }

  /* ── Ubah ukuran dengan menarik pojok ── */
  function onResizeMove(event: PointerEvent) {
    const r = resizeRef.current;
    const grid = gridRef.current;
    const el = r ? slotRefs.current.get(r.key) : null;
    if (!r || !grid || !el || event.pointerId !== r.pointerId) return;

    const gr = grid.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const columns = ((event.clientX - rect.left + GRID_GAP_PX) / (gr.width + GRID_GAP_PX)) * 12;
    const rows = (event.clientY - rect.top + GRID_GAP_PX) / (ROW_HEIGHT_PX + GRID_GAP_PX);
    setLayout((current) =>
      resizeWidget(current, r.key, { span: nearestSpan(r.key, columns), rows: nearestRows(r.key, rows) })
    );
  }

  function endResize(event: PointerEvent) {
    if (resizeRef.current && event.pointerId !== resizeRef.current.pointerId) return;
    resizeRef.current = null;
    detachListeners();
  }

  function startResize(key: WidgetKey, event: React.PointerEvent) {
    if (resizeRef.current || dragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = { key, pointerId: event.pointerId };
    attachListeners(onResizeMove, endResize);
  }

  // Lepas semua pendengar kalau papan hilang di tengah geser.
  useEffect(
    () => () => {
      if (dragRef.current) cancelAnimationFrame(dragRef.current.raf);
      dragRef.current = null;
      resizeRef.current = null;
      detachListeners();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* ── Aksi tombol ── */
  function change(next: WidgetState[], message?: string) {
    setLayout(next);
    setError(null);
    if (message) setAnnounce(message);
  }

  function onGripKeyDown(key: WidgetKey, event: React.KeyboardEvent) {
    const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const list = visibleWidgets(layout);
    const from = list.findIndex((w) => w.key === key);
    const to = from + delta;
    if (to < 0 || to >= list.length) return;
    focusGripRef.current = key;
    change(nudgeVisible(layout, key, delta as -1 | 1), `${WIDGETS[key].title} dipindah ke urutan ${to + 1} dari ${list.length}`);
  }

  function cancel() {
    setLayout(baseline);
    setError(null);
    setEditing(false);
  }

  function done() {
    if (!dirty) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveDashboardLayout(layout.map((w) => ({ key: w.key, span: w.span, rows: w.rows, visible: w.visible })));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBaseline(layout);
      setEditing(false);
      router.refresh();
    });
  }

  // Escape membatalkan (kecuali sedang menyimpan atau menggeser).
  useEffect(() => {
    if (!editing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending && !dragRef.current && !document.querySelector("[role=dialog]")) cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, pending, baseline]);

  return (
    <div>
      {editing ? (
        <div
          role="toolbar"
          aria-label="Mengatur widget"
          className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-30 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 p-2 pl-4 shadow-[0_12px_32px_-16px_hsl(var(--foreground)/0.35)] backdrop-blur"
        >
          <p className="mr-auto min-w-0 text-sm">
            <span className="font-medium">Mengatur widget</span>
            <span className="ml-2 hidden text-muted-foreground md:inline">Geser untuk menukar tempat, tarik pojok untuk mengubah ukuran.</span>
          </p>

          <Button type="button" variant="subtle" size="sm" onClick={() => setTrayOpen((v) => !v)} aria-expanded={trayOpen}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah widget
            {hidden.length > 0 ? (
              <span className="tabular rounded-full bg-primary px-1.5 text-[11px] leading-5 text-primary-foreground">{hidden.length}</span>
            ) : null}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => change(defaultLayout(), "Susunan dikembalikan ke bawaan")}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Susunan awal</span>
            <span className="sr-only sm:hidden">Kembalikan susunan awal</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={cancel} disabled={pending}>
            Batal
          </Button>
          <Button type="button" size="sm" onClick={done} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
            Selesai
          </Button>
        </div>
      ) : null}

      {editing && error ? (
        <p role="alert" className="mb-4 rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">
          {error}
        </p>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {editing && trayOpen ? (
        <section aria-label="Widget yang bisa ditambahkan" className="mb-4 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          {hidden.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">Semua widget sudah terpasang. Sembunyikan satu untuk menaruhnya di sini.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {hidden.map((w) => {
                const def = WIDGETS[w.key];
                const Icon = ICONS[w.key];
                return (
                  <li key={w.key}>
                    <button
                      type="button"
                      onClick={() => change(showWidget(layout, w.key), `${def.title} ditambahkan`)}
                      className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                        <Icon className="h-[18px] w-[18px]" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{def.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{def.description}</span>
                      </span>
                      <Plus className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:rotate-90 group-hover:text-primary" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-serif text-lg">Dashboard masih kosong</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {editing ? "Pilih widget dari daftar di atas untuk mulai menyusun." : "Pakai tombol Atur widget di banner untuk menambahkan widget."}
          </p>
        </div>
      ) : (
        <div ref={gridRef} className="widget-grid" data-editing={editing || undefined}>
          {visible.map((state, index) => (
            <WidgetSlot
              key={state.key}
              state={state}
              index={index}
              editing={editing}
              dragging={dragKey === state.key}
              register={register}
              overlay={(width) => (
                <EditOverlay
                  state={state}
                  width={width}
                  onSpan={(span) => change(resizeWidget(layout, state.key, { span }), `${WIDGETS[state.key].title}: ${SPAN_NAME[span]}`)}
                  onRows={(rows) => change(resizeWidget(layout, state.key, { rows }), `${WIDGETS[state.key].title}: ${rows} baris`)}
                  onHide={() => change(hideWidget(layout, state.key), `${WIDGETS[state.key].title} disembunyikan`)}
                  onGripPointerDown={(event) => {
                    event.stopPropagation();
                    startDrag(state.key, event);
                  }}
                  onGripKeyDown={(event) => onGripKeyDown(state.key, event)}
                  onOverlayPointerDown={(event) => {
                    if ((event.target as HTMLElement).closest("[data-no-drag], [data-grip]")) return;
                    if (event.pointerType === "mouse" && event.button === 0) startDrag(state.key, event);
                  }}
                  onResizePointerDown={(event) => startResize(state.key, event)}
                />
              )}
            >
              {nodes[state.key] ?? <WidgetPlaceholder />}
            </WidgetSlot>
          ))}
        </div>
      )}
    </div>
  );
}
