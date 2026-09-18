"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export type ViewKey = "bersama" | "eki" | "dinda";

export function MemberSwitcher({
  value,
  labels,
  className,
}: {
  value: ViewKey;
  labels: { eki: string; dinda: string };
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const options: { key: ViewKey; label: string }[] = [
    { key: "bersama", label: "Bersama" },
    { key: "eki", label: labels.eki },
    { key: "dinda", label: labels.dinda },
  ];

  function select(key: ViewKey) {
    const next = new URLSearchParams(params.toString());
    if (key === "bersama") next.delete("view");
    else next.set("view", key);
    startTransition(() => {
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-black/25 p-1 backdrop-blur-sm",
        pending && "opacity-70",
        className
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => select(option.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95",
              active ? "bg-white text-neutral-900 shadow-sm" : "text-white/75 hover:text-white"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
