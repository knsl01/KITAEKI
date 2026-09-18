"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { THEMES, useTheme, type ModeId, type ThemeId } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MODES: { id: ModeId; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Terang", icon: Sun },
  { id: "dark", label: "Gelap", icon: Moon },
  { id: "system", label: "Ikut sistem", icon: Monitor },
];

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, mode, setTheme, setMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("icon-lift", className)} aria-label="Ganti tema">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        {THEMES.map((option) => (
          <DropdownMenuItem key={option.id} onSelect={() => setTheme(option.id as ThemeId)}>
            <span className="flex h-3.5 w-3.5 overflow-hidden rounded-full ring-1 ring-black/10">
              <span className="w-1/2" style={{ backgroundColor: option.swatch }} />
              <span className="w-1/2" style={{ backgroundColor: option.dark }} />
            </span>
            <span className="flex-1">{option.label}</span>
            {theme === option.id ? <Check className="h-3.5 w-3.5" /> : null}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {MODES.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem key={option.id} onSelect={() => setMode(option.id)}>
              <Icon className="h-3.5 w-3.5" />
              <span className="flex-1">{option.label}</span>
              {mode === option.id ? <Check className="h-3.5 w-3.5" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Versi kartu untuk halaman Pengaturan. */
export function ThemePicker() {
  const { theme, mode, setTheme, setMode } = useTheme();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
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
              <span className="flex h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10">
                <span className="w-1/2" style={{ backgroundColor: option.swatch }} />
                <span className="w-1/2" style={{ backgroundColor: option.dark }} />
              </span>
              <span className="flex-1">{option.label}</span>
              {active ? <Check className="h-4 w-4" /> : null}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        {MODES.map((option) => {
          const Icon = option.icon;
          const active = mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors duration-200",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
