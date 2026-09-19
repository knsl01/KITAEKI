"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import {
  RADII,
  THEMES,
  useTheme,
  type ModeId,
  type RadiusId,
  type ThemeId,
} from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MODES: { id: ModeId; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Terang", icon: Sun },
  { id: "dark", label: "Gelap", icon: Moon },
  { id: "system", label: "Ikut sistem", icon: Monitor },
];

const RADIUS_SAMPLE: Record<RadiusId, string> = { sharp: "3px", soft: "9px", round: "18px" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Pilihan tampilan dalam satu panel: warna, terang/gelap, dan sudut. Hurufnya tetap Plus Jakarta Sans.
 * Setiap pilihan langsung berlaku dan tersimpan di browser ini.
 */
export function ThemePicker() {
  const { theme, mode, radius, setTheme, setMode, setRadius } = useTheme();

  return (
    <div className="space-y-6">
      <Section title="Warna">
        <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Warna tema">
          {THEMES.map((option) => {
            const active = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(option.id as ThemeId)}
                className={cn(
                  "group rounded-xl border p-1.5 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                )}
              >
                {/* Pratinjau mini: separuh terang, separuh gelap */}
                <span className="relative flex h-14 overflow-hidden rounded-lg ring-1 ring-black/5">
                  <span className="relative w-1/2 bg-[#F7F6F3]">
                    <span className="absolute left-2 top-2.5 h-2 w-7 rounded-full" style={{ backgroundColor: option.swatch }} />
                    <span className="absolute left-2 top-6 h-1.5 w-10 rounded-full opacity-25" style={{ backgroundColor: option.swatch }} />
                    <span className="absolute bottom-2 left-2 h-4 w-4 rounded-full" style={{ backgroundColor: option.swatch }} />
                  </span>
                  <span className="relative w-1/2" style={{ backgroundColor: option.dark }}>
                    <span className="absolute right-2 top-2.5 h-2 w-7 rounded-full bg-white/70" />
                    <span className="absolute right-2 top-6 h-1.5 w-10 rounded-full bg-white/20" />
                    <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full bg-white/55" />
                  </span>
                </span>
                <span className="mt-1.5 flex items-center justify-between gap-1 px-1 pb-0.5 text-sm">
                  <span className="truncate">{option.label}</span>
                  {active ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Terang atau gelap">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Mode warna">
          {MODES.map((option) => {
            const Icon = option.icon;
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(option.id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Sudut kartu">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Kebulatan sudut">
          {RADII.map((option) => {
            const active = radius === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRadius(option.id as RadiusId)}
                className={cn(
                  "flex items-center justify-center gap-2.5 rounded-lg border px-2 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                )}
              >
                <span
                  aria-hidden
                  className={cn("h-5 w-5 border-l-2 border-t-2", active ? "border-primary" : "border-muted-foreground/60")}
                  style={{ borderTopLeftRadius: RADIUS_SAMPLE[option.id] }}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/** Tombol di topbar: membuka panel Gaya. */
export function ThemeSwitcher({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("icon-lift", className)} aria-label="Ubah gaya tampilan">
          <Palette className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gaya tampilan</DialogTitle>
          <DialogDescription>Berlaku langsung dan tersimpan di browser ini. Eki dan Dinda boleh beda selera.</DialogDescription>
        </DialogHeader>
        <ThemePicker />
      </DialogContent>
    </Dialog>
  );
}
