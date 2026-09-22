"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getUserPreferences, saveUserPreferences } from "@/app/actions/preferences";

export const THEMES = [
  { id: "sage", label: "Sage", swatch: "#3F5540", dark: "#14201A" },
  { id: "deep-purple", label: "Deep purple", swatch: "#4B2E70", dark: "#1B1226" },
  { id: "deep-blue", label: "Deep blue", swatch: "#24406B", dark: "#0F1724" },
  // Perpaduan biru + ungu tua, senada dengan latar Aurora di halaman Masuk/Daftar — lebih neon & hidup dari Deep blue/Deep purple biasa.
  { id: "nebula", label: "Nebula", swatch: "#2B4EDB", dark: "#150B33", accent: "#9B6BFF" },
  { id: "burgundy", label: "Burgundy", swatch: "#6B2036", dark: "#1F0F15" },
  { id: "ocean", label: "Ocean", swatch: "#196978", dark: "#0C1719" },
  { id: "honey", label: "Honey", swatch: "#8D5311", dark: "#16110D" },
  { id: "graphite", label: "Graphite", swatch: "#272B35", dark: "#111319" },
  // accent = warna sorotan di separuh gelap pratinjau (tema lain memakai putih)
  { id: "blackpink", label: "Black Pink", swatch: "#0A0A0A", dark: "#0A0A0A", accent: "#FF2E93" },
  { id: "midnight-rose", label: "Midnight Rose", swatch: "#8F2454", dark: "#160812", accent: "#FF8AB8" },
  { id: "matcha", label: "Matcha", swatch: "#527A43", dark: "#101B12", accent: "#B7EA8A" },
  { id: "amethyst-night", label: "Amethyst Night", swatch: "#6E4AA8", dark: "#100C1E", accent: "#C4A2FF" },
] as const;

export const RADII = [
  { id: "sharp", label: "Tegas" },
  { id: "soft", label: "Lembut" },
  { id: "round", label: "Bulat" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type RadiusId = (typeof RADII)[number]["id"];
export type ModeId = "light" | "dark" | "system";
const MODES: ModeId[] = ["light", "dark", "system"];

export const DEFAULT_THEME: ThemeId = "sage";
export const DEFAULT_RADIUS: RadiusId = "soft";
export const THEME_KEY = "kita-theme";
export const MODE_KEY = "kita-mode";
export const RADIUS_KEY = "kita-radius";

/** Dijalankan sebelum halaman digambar supaya tidak ada kedip warna atau huruf. */
export const themeBootstrapScript = `(function(){try{
var el=document.documentElement;
var ok=function(list,v,d){return list.indexOf(v)>-1?v:d;};
el.dataset.theme=ok(${JSON.stringify(THEMES.map((t) => t.id))},localStorage.getItem("${THEME_KEY}"),"${DEFAULT_THEME}");
el.dataset.radius=ok(${JSON.stringify(RADII.map((r) => r.id))},localStorage.getItem("${RADIUS_KEY}"),"${DEFAULT_RADIUS}");
var m=localStorage.getItem("${MODE_KEY}")||"system";
var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
el.dataset.mode=dark?"dark":"light";
}catch(e){var d=document.documentElement;d.dataset.theme="${DEFAULT_THEME}";d.dataset.radius="${DEFAULT_RADIUS}";d.dataset.mode="light";}})();`;

type ThemeContextValue = {
  theme: ThemeId;
  mode: ModeId;
  radius: RadiusId;
  resolvedMode: "light" | "dark";
  setTheme: (theme: ThemeId) => void;
  setMode: (mode: ModeId) => void;
  setRadius: (radius: RadiusId) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  mode: "system",
  radius: DEFAULT_RADIUS,
  resolvedMode: "light",
  setTheme: () => {},
  setMode: () => {},
  setRadius: () => {},
});

function resolve(mode: ModeId): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // penyimpanan browser diblokir — pilihan berlaku sampai tab ditutup
  }
}

function pickFrom<T extends { id: string }>(list: readonly T[], value: string | undefined, fallback: T["id"]) {
  return (list.some((item) => item.id === value) ? value : fallback) as T["id"];
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [radius, setRadiusState] = useState<RadiusId>(DEFAULT_RADIUS);
  const [mode, setModeState] = useState<ModeId>("system");
  const [resolvedMode, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Skrip bootstrap sudah memasang atribut; state React tinggal menyamakan diri.
    const el = document.documentElement;
    setThemeState(pickFrom(THEMES, el.dataset.theme, DEFAULT_THEME) as ThemeId);
    setRadiusState(pickFrom(RADII, el.dataset.radius, DEFAULT_RADIUS) as RadiusId);

    let storedMode: ModeId = "system";
    try {
      storedMode = (localStorage.getItem(MODE_KEY) as ModeId | null) ?? "system";
    } catch {
      storedMode = "system";
    }
    setModeState(storedMode);
    setResolved(resolve(storedMode));
    // Sinkronkan preferensi dari akun login. Ini membuat dua user pada browser
    // yang sama tetap memiliki tema, mode, dan radius masing-masing.
    void getUserPreferences().then((preferences) => {
      if (!preferences) return;
      const nextTheme = pickFrom(THEMES, preferences.theme, DEFAULT_THEME) as ThemeId;
      const nextRadius = pickFrom(RADII, preferences.radius, DEFAULT_RADIUS) as RadiusId;
      const nextMode = (MODES.includes(preferences.mode as ModeId) ? preferences.mode : "system") as ModeId;
      setThemeState(nextTheme);
      setRadiusState(nextRadius);
      setModeState(nextMode);
      setResolved(resolve(nextMode));
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.dataset.radius = nextRadius;
      document.documentElement.dataset.mode = resolve(nextMode);
    });
  }, []);

  // Ikut berubah kalau sistem ganti terang/gelap dan mode masih "system"
  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = query.matches ? "dark" : "light";
      document.documentElement.dataset.mode = next;
      setResolved(next);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    remember(THEME_KEY, next);
    void saveUserPreferences({ theme: next });
  }, []);

  const setRadius = useCallback((next: RadiusId) => {
    setRadiusState(next);
    document.documentElement.dataset.radius = next;
    remember(RADIUS_KEY, next);
    void saveUserPreferences({ radius: next });
  }, []);

  const setMode = useCallback((next: ModeId) => {
    setModeState(next);
    const actual = resolve(next);
    document.documentElement.dataset.mode = actual;
    setResolved(actual);
    remember(MODE_KEY, next);
    void saveUserPreferences({ mode: next });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mode, radius, resolvedMode, setTheme, setMode, setRadius }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
