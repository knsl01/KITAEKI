"use client";

import { useState } from "react";
import { BRANDS, CATEGORY_ICON_KEYS, categoryIcon } from "@/lib/icons";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Pilih bank atau e-wallet untuk sebuah akun. */
export function BrandPicker({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="space-y-2">
      <Label>Bank / e-wallet</Label>
      <input type="hidden" name={name} value={value} />
      <div className="kita-scrollbar grid max-h-48 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-6">
        {BRANDS.map((brand) => {
          const active = value === brand.key;
          return (
            <button
              key={brand.key}
              type="button"
              onClick={() => setValue(active ? "" : brand.key)}
              title={brand.label}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all duration-200 hover:bg-muted active:scale-95",
                active && "bg-muted ring-2 ring-ring"
              )}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[10px] font-semibold text-white"
                style={{ backgroundColor: brand.color }}
              >
                {brand.short}
              </span>
              <span className="w-full truncate text-center text-[10px] text-muted-foreground">{brand.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pilih ikon untuk sebuah kategori. */
export function CategoryIconPicker({
  name,
  defaultValue,
  color = "#3F5540",
}: {
  name: string;
  defaultValue?: string | null;
  color?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="space-y-2">
      <Label>Ikon</Label>
      <input type="hidden" name={name} value={value} />
      <div className="kita-scrollbar grid max-h-40 grid-cols-7 gap-1.5 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-9">
        {CATEGORY_ICON_KEYS.map((key) => {
          const Icon = categoryIcon(key);
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setValue(active ? "" : key)}
              title={key}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-muted active:scale-90",
                active && "ring-2 ring-ring"
              )}
              style={active ? { backgroundColor: `${color}1A`, color } : undefined}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
