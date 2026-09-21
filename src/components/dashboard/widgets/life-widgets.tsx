"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleShoppingItem } from "@/app/actions/shopping";
import { toggleTask } from "@/app/actions/tasks";
import { fitRows, FrameLink, useWidgetBox, WidgetFrame } from "@/components/dashboard/widget-frame";
import { CheckButton, useAction } from "@/components/views/life-shared";
import { daysBetween, relativeDays } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { OWNER_LABEL, type ItemPriority, type MemberOwner } from "@/lib/types";
import { cn } from "@/lib/utils";

function without(set: Set<string>, id: string) {
  const next = new Set(set);
  next.delete(id);
  return next;
}

function Empty({ title, description, href, cta }: { title: string; description: string; href: string; cta: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <p className="font-serif text-base">{title}</p>
      <p className="max-w-[16rem] text-sm text-muted-foreground">{description}</p>
      <Link href={href} className="mt-2 rounded-md px-2 py-1 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {cta}
      </Link>
    </div>
  );
}

/* ── Tugas ─────────────────────────────────────────────── */

export type TaskRow = { id: string; title: string; due_on: string | null; assigned_to: MemberOwner };

export function TasksWidget({ tasks, today }: { tasks: TaskRow[]; today: string }) {
  const box = useWidgetBox();
  const { run, pending, error } = useAction();
  const [done, setDone] = useState<Set<string>>(new Set());

  const open = tasks.filter((t) => !done.has(t.id));
  const rows = fitRows(box.height, 54, error ? 24 : 0);
  const shown = open.slice(0, rows);
  const extra = open.length - shown.length;

  function complete(task: TaskRow) {
    setDone((prev) => new Set(prev).add(task.id));
    run(async () => {
      const result = await toggleTask(task.id, true);
      if (!result.ok) setDone((prev) => without(prev, task.id)); // gagal: tugas muncul lagi
      return result;
    });
  }

  return (
    <WidgetFrame title="Tugas" action={<FrameLink href="/dashboard/calendar">Buka</FrameLink>}>
      {open.length === 0 ? (
        <Empty title={tasks.length ? "Semua tugas beres" : "Belum ada tugas"} description={tasks.length ? "Tidak ada yang menunggu. Nikmati harinya." : "Catat hal yang perlu dikerjakan berdua."} href="/dashboard/calendar" cta="Buka Tugas" />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <ul className="min-h-0 flex-1 overflow-hidden">
            {shown.map((task) => {
              const diff = task.due_on ? daysBetween(today, task.due_on) : null;
              const overdue = diff !== null && diff < 0;
              return (
                <li key={task.id} className="flex h-[54px] items-center gap-3 rounded-xl px-2 transition-colors duration-150 hover:bg-muted/70">
                  <CheckButton
                    checked={false}
                    disabled={pending}
                    onClick={() => complete(task)}
                    label={`Tandai selesai: ${task.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{task.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {OWNER_LABEL[task.assigned_to]}
                      {diff !== null ? (
                        <>
                          {" · "}
                          <span className={cn(overdue && "font-medium text-negative")}>{relativeDays(diff)}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {error ? <p className="shrink-0 text-xs text-negative">{error}</p> : null}
          {extra > 0 ? <p className="shrink-0 pt-1 text-center text-xs text-muted-foreground">+{extra} tugas lain</p> : null}
        </div>
      )}
    </WidgetFrame>
  );
}

/* ── Belanja ───────────────────────────────────────────── */

export type ShoppingRow = { id: string; name: string; quantity: string | null; estimated_price: number | null; assigned_to: MemberOwner };

export function ShoppingWidget({ items }: { items: ShoppingRow[] }) {
  const box = useWidgetBox();
  const { run, pending, error } = useAction();
  const [bought, setBought] = useState<Set<string>>(new Set());

  const open = items.filter((i) => !bought.has(i.id));
  const estimate = open.reduce((sum, i) => sum + Number(i.estimated_price ?? 0), 0);
  const rows = fitRows(box.height, 48, (estimate > 0 ? 28 : 0) + (error ? 24 : 0));
  const shown = open.slice(0, rows);
  const extra = open.length - shown.length;

  return (
    <WidgetFrame title="Daftar belanja" action={<FrameLink href="/dashboard/shopping">Buka</FrameLink>}>
      {open.length === 0 ? (
        <Empty title={items.length ? "Keranjang sudah penuh" : "Daftar belanja kosong"} description={items.length ? "Semua yang ada di daftar sudah dibeli." : "Tambah barang yang perlu dibeli minggu ini."} href="/dashboard/shopping" cta="Buka Belanja" />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <ul className="min-h-0 flex-1 overflow-hidden">
            {shown.map((item) => (
              <li key={item.id} className="flex h-12 items-center gap-3 rounded-xl px-2 transition-colors duration-150 hover:bg-muted/70">
                <CheckButton
                  checked={false}
                  disabled={pending}
                  onClick={() => {
                    setBought((prev) => new Set(prev).add(item.id));
                    run(async () => {
                      const result = await toggleShoppingItem(item.id, true);
                      if (!result.ok) setBought((prev) => without(prev, item.id));
                      return result;
                    });
                  }}
                  label={`Tandai sudah dibeli: ${item.name}`}
                />
                <p className="min-w-0 flex-1 truncate text-sm">
                  {item.name}
                  {item.quantity ? <span className="ml-1.5 text-xs text-muted-foreground">{item.quantity}</span> : null}
                </p>
                {item.estimated_price ? (
                  <span className="tabular shrink-0 text-xs text-muted-foreground">{formatCurrency(Number(item.estimated_price))}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {error ? <p className="shrink-0 text-xs text-negative">{error}</p> : null}
          {extra > 0 ? <p className="shrink-0 pt-1 text-center text-xs text-muted-foreground">+{extra} barang lain</p> : null}
          {estimate > 0 ? (
            <p className="tabular flex shrink-0 items-baseline justify-between border-t border-border/70 pt-2 text-xs text-muted-foreground">
              <span>Perkiraan total</span>
              <span className="text-sm font-medium text-foreground">{formatCurrency(estimate)}</span>
            </p>
          ) : null}
        </div>
      )}
    </WidgetFrame>
  );
}

/* ── Wishlist ──────────────────────────────────────────── */

export type WishRow = { id: string; name: string; price: number | null; priority: ItemPriority };

const PRIORITY_DOT: Record<ItemPriority, string> = {
  high: "bg-negative",
  medium: "bg-primary",
  low: "bg-muted-foreground/40",
};
const PRIORITY_SHORT: Record<ItemPriority, string> = { high: "Tinggi", medium: "Sedang", low: "Rendah" };

export function WishlistWidget({ items }: { items: WishRow[] }) {
  const box = useWidgetBox();
  const total = items.reduce((sum, i) => sum + Number(i.price ?? 0), 0);
  const rows = fitRows(box.height, 48, total > 0 ? 28 : 0);
  const shown = items.slice(0, rows);
  const extra = items.length - shown.length;

  return (
    <WidgetFrame title="Wishlist" action={<FrameLink href="/dashboard/wishlist">Buka</FrameLink>}>
      {items.length === 0 ? (
        <Empty title="Wishlist masih kosong" description="Simpan barang incaran supaya tidak lupa." href="/dashboard/wishlist" cta="Buka Wishlist" />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <ul className="min-h-0 flex-1 overflow-hidden">
            {shown.map((item) => (
              <li key={item.id} className="flex h-12 items-center gap-3 rounded-xl px-2 transition-colors duration-150 hover:bg-muted/70">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", PRIORITY_DOT[item.priority])} title={`Prioritas ${PRIORITY_SHORT[item.priority].toLowerCase()}`} />
                <span className="sr-only">Prioritas {PRIORITY_SHORT[item.priority].toLowerCase()}</span>
                <p className="min-w-0 flex-1 truncate text-sm">{item.name}</p>
                {item.price ? <span className="tabular shrink-0 text-xs text-muted-foreground">{formatCurrency(Number(item.price))}</span> : null}
              </li>
            ))}
          </ul>
          {extra > 0 ? <p className="shrink-0 pt-1 text-center text-xs text-muted-foreground">+{extra} barang lain</p> : null}
          {total > 0 ? (
            <p className="tabular flex shrink-0 items-baseline justify-between border-t border-border/70 pt-2 text-xs text-muted-foreground">
              <span>Total incaran</span>
              <span className="text-sm font-medium text-foreground">{formatCurrency(total)}</span>
            </p>
          ) : null}
        </div>
      )}
    </WidgetFrame>
  );
}
