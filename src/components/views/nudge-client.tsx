"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CircleAlert, CircleDollarSign, CircleHelp, Clock3, Lightbulb, Loader2, PiggyBank, RefreshCw, ShoppingBasket, Tags, Wallet, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Nudge, NudgeCategory, NudgePriority } from "@/lib/nudge/types";
import { cn } from "@/lib/utils";

const PRIORITIES: { key: NudgePriority; label: string }[] = [
  { key: "attention", label: "Perlu diperhatikan" },
  { key: "worth-knowing", label: "Patut diketahui" },
  { key: "helpful", label: "Bermanfaat" },
];

const CATEGORY_ICONS: Record<NudgeCategory, LucideIcon> = {
  money: CircleDollarSign,
  bills: CalendarClock,
  targets: PiggyBank,
  savings: Wallet,
  shopping: ShoppingBasket,
  cleanup: Tags,
};

function readDismissed(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export function NudgeClient({ nudges, householdId, errorMessage }: { nudges: Nudge[]; householdId: string; errorMessage?: string }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string> | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const storageKey = `kita-nudge-dismissed:${householdId}`;

  useEffect(() => {
    setDismissed(new Set(readDismissed(storageKey)));
  }, [storageKey]);

  const visible = useMemo(() => dismissed ? nudges.filter((nudge) => !dismissed.has(nudge.id)) : [], [dismissed, nudges]);

  function dismiss(id: string) {
    setDismissed((current) => {
      const next = new Set(current ?? []);
      next.add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next].slice(-100)));
      } catch {
        // A private or full browser store should not prevent dismissing this insight in memory.
      }
      return next;
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Nudge</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hal yang mungkin perlu kamu tahu.</p>
          <p className="mt-2 text-xs text-muted-foreground">{dismissed === null ? "Menyiapkan insight…" : `${visible.length} insight hari ini`}</p>
        </div>
        <Button variant="outline" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing} className="min-h-11">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Segarkan
        </Button>
      </div>

      {errorMessage ? <div role="alert" className="mb-5 rounded-xl border border-negative/30 bg-negative/5 p-4 text-sm text-negative">{errorMessage}</div> : null}
      {dismissed === null && !errorMessage ? <div role="status" className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat insight…</div> : null}

      {dismissed !== null && !errorMessage && visible.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card px-5 py-12 text-center">
          <Lightbulb className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 font-serif text-xl">Semua terlihat aman.</h2>
          <p className="mt-1 text-sm text-muted-foreground">Belum ada hal penting yang perlu kamu perhatikan.</p>
        </div>
      ) : null}

      <div className="space-y-7">
        {PRIORITIES.map((priority) => {
          const section = visible.filter((nudge) => nudge.priority === priority.key);
          if (!section.length) return null;
          return <section key={priority.key} aria-labelledby={`nudge-${priority.key}`}>
            <h2 id={`nudge-${priority.key}`} className="mb-2 border-b border-border pb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{priority.label}</h2>
            <ul className="divide-y divide-border">
              {section.map((nudge) => <NudgeRow key={nudge.id} nudge={nudge} onDismiss={() => dismiss(nudge.id)} />)}
            </ul>
          </section>;
        })}
      </div>
    </div>
  );
}

function NudgeRow({ nudge, onDismiss }: { nudge: Nudge; onDismiss: () => void }) {
  const Icon = nudge.kind === "warning" ? CircleAlert : nudge.kind === "positive" ? Lightbulb : CATEGORY_ICONS[nudge.category] ?? CircleHelp;
  return (
    <li className="flex items-start gap-3 py-4 sm:gap-4">
      <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/70", nudge.kind === "positive" && "text-[hsl(var(--positive))]", nudge.kind === "warning" && "text-negative", nudge.kind !== "positive" && nudge.kind !== "warning" && "text-primary")}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-semibold leading-snug">{nudge.title}</h3>
          {nudge.metric ? <span className="tabular shrink-0 text-sm font-semibold">{nudge.metric}</span> : null}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{nudge.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {nudge.action ? (
            <Button asChild size="sm" variant="outline" className="min-h-11"><Link href={nudge.action.href}>{nudge.action.label}</Link></Button>
          ) : null}
          <span className="text-[11px] text-muted-foreground">{nudge.kind === "warning" ? "Perlu dicek" : nudge.kind === "positive" ? "Kabar baik" : nudge.kind === "informational" ? "Info" : "Saran"}</span>
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon" aria-label={`Sembunyikan insight: ${nudge.title}`} onClick={onDismiss} className="h-11 w-11 shrink-0 text-muted-foreground">
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}
