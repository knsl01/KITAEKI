"use client";

import { Check, Palette } from "lucide-react";
import { THEMES, useTheme, type ThemeId } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("icon-lift", className)} aria-label="Ganti tema">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        {THEMES.map((option) => (
          <DropdownMenuItem key={option.id} onSelect={() => setTheme(option.id as ThemeId)}>
            <span
              className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10 transition-transform duration-200"
              style={{ backgroundColor: option.swatch }}
            />
            <span className="flex-1">{option.label}</span>
            {theme === option.id ? <Check className="h-3.5 w-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Versi kartu, dipakai di halaman Pengaturan. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {THEMES.map((option) => {
        const active = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id as ThemeId)}
            className={cn(
              "card-interactive flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm",
              active ? "border-primary" : "border-border"
            )}
          >
            <span
              className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: option.swatch }}
            />
            <span className="flex-1">{option.label}</span>
            {active ? <Check className="h-4 w-4" /> : null}
          </button>
        );
      })}
    </div>
  );
}
