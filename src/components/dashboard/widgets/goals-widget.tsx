"use client";

import { Check } from "lucide-react";
import { fitRows, FrameLink, useWidgetBox, WidgetFrame } from "@/components/dashboard/widget-frame";
import { daysBetween, relativeDays } from "@/lib/dates";
import { formatCurrency, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type GoalRow = {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  target_date: string | null;
};

export function GoalsWidget({ goals, today }: { goals: GoalRow[]; today: string }) {
  const box = useWidgetBox();
  const rows = fitRows(box.height, 78);
  const shown = goals.slice(0, rows);
  const extra = goals.length - shown.length;

  return (
    <WidgetFrame title="Target tabungan" action={<FrameLink href="/dashboard/savings">Lihat semua</FrameLink>}>
      {goals.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
          <p className="font-serif text-base">Belum ada target</p>
          <p className="max-w-[16rem] text-sm text-muted-foreground">Buat target pertama kalian di halaman Tabungan.</p>
        </div>
      ) : (
        <ul className="flex h-full min-h-0 flex-col justify-start gap-3.5 overflow-hidden">
          {shown.map((goal) => {
            const progress = percent(Number(goal.current_amount), Number(goal.target_amount));
            const done = progress >= 100;
            const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));
            const days = goal.target_date ? daysBetween(today, goal.target_date) : null;

            return (
              <li key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {done ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-positive text-white" aria-hidden>
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                    <span className="truncate">{goal.name}</span>
                  </span>
                  <span className={cn("tabular shrink-0 text-xs font-semibold", done ? "text-positive" : "text-foreground")}>{progress}%</span>
                </div>

                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("grow-x h-full rounded-full", done ? "bg-positive" : "bg-primary")}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                  {[25, 50, 75].map((tick) => (
                    <span key={tick} aria-hidden className="absolute top-0 h-full w-px bg-card/70" style={{ left: `${tick}%` }} />
                  ))}
                </div>

                <p className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                  <span className="tabular truncate">
                    {done ? `Tercapai · ${formatCurrency(Number(goal.target_amount))}` : `${formatCurrency(Number(goal.current_amount))} dari ${formatCurrency(Number(goal.target_amount))}`}
                  </span>
                  {!done && days !== null ? (
                    <span className={cn("shrink-0", days < 0 && "text-negative")}>{relativeDays(days)}</span>
                  ) : !done && box.width >= 300 ? (
                    <span className="tabular shrink-0">sisa {formatCurrency(remaining, { compact: true })}</span>
                  ) : null}
                </p>
              </li>
            );
          })}
          {extra > 0 ? <li className="text-center text-xs text-muted-foreground">+{extra} target lain</li> : null}
        </ul>
      )}
    </WidgetFrame>
  );
}
