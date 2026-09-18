"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemberOwner } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

/** Jalankan server action, tampilkan galatnya, lalu segarkan data halaman. */
export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<Result>, onSuccess?: () => void) {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  return { run, pending, error };
}

export function CheckButton({
  checked,
  onClick,
  label,
  disabled,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-ring"
      )}
    >
      {checked ? <Check className="h-3 w-3" aria-hidden /> : null}
    </button>
  );
}

export type OwnerFilter = "all" | MemberOwner;

const FILTERS: { key: OwnerFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "eki", label: "Eki" },
  { key: "dinda", label: "Dinda" },
  { key: "shared", label: "Bersama" },
];

export function OwnerFilterTabs({ value, onChange }: { value: OwnerFilter; onChange: (next: OwnerFilter) => void }) {
  return (
    <div role="radiogroup" aria-label="Saring berdasarkan pemilik" className="inline-flex rounded-full bg-muted p-0.5">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          role="radio"
          aria-checked={value === f.key}
          onClick={() => onChange(f.key)}
          className={cn(
            "h-7 rounded-full px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === f.key
              ? "bg-card text-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.1)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

/** Milik Eki/Dinda muncul di filter masing-masing, milik Bersama muncul di semua. */
export function matchesOwner(filter: OwnerFilter, owner: MemberOwner) {
  return filter === "all" || filter === owner || owner === "shared";
}

export function FormError({ message }: { message: string | null }) {
  return message ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p> : null;
}
