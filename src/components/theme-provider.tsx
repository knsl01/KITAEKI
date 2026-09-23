"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  { id: "deep-black", label: "Deep Black", swatch: "#151A20", dark: "#05080B", accent: "#83D9F2" },
] as const;

export const RADII = [
  { id: "sharp", label: "Tegas" },
  { id: "soft", label: "Lembut" },
  { id: "round", label: "Bulat" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type RadiusId = (typeof RADII)[number]["id"];
export type ModeId = "light" | "dark" | "system";
export type FlowColor = "145 72% 38%" | "145 82% 28%" | "95 72% 36%" | "351 78% 48%" | "0 78% 42%" | "12 82% 48%";
const MODES: ModeId[] = ["light", "dark", "system"];

export const DEFAULT_THEME: ThemeId = "sage";
export const DEFAULT_RADIUS: RadiusId = "soft";
export const THEME_KEY = "kita-theme";
export const MODE_KEY = "kita-mode";
export const RADIUS_KEY = "kita-radius";
const THEME_SYNC_KEY = "kita-theme-sync";

let preferenceSaveQueue: Promise<unknown> = Promise.resolve();

function queuePreferenceSave(input: Parameters<typeof saveUserPreferences>[0]) {
  const request = preferenceSaveQueue.catch(() => undefined).then(() => saveUserPreferences(input));
  preferenceSaveQueue = request.catch(() => undefined);
  void request.then((result) => {
    if (!result.ok) console.warn("Preferensi belum tersimpan ke akun:", result.error);
  }).catch((error) => console.warn("Preferensi belum tersimpan ke akun:", error));
}

function rememberThemeSync(theme: ThemeId, userId: string | null, updatedAt = Date.now()) {
  try {
    localStorage.setItem(THEME_SYNC_KEY, JSON.stringify({ theme, userId, updatedAt }));
  } catch {
    // Tema tetap berlaku pada sesi ini walau penyimpanan browser diblokir.
  }
}

function readThemeSync(): { theme?: string; userId?: string | null; updatedAt?: number } | null {
  try {
    const raw = localStorage.getItem(THEME_SYNC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
  positiveColor: FlowColor | null;
  negativeColor: FlowColor | null;
  setFlowColors: (positive: FlowColor | null, negative: FlowColor | null) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  mode: "system",
  radius: DEFAULT_RADIUS,
  resolvedMode: "light",
  setTheme: () => {},
  setMode: () => {},
  setRadius: () => {},
  positiveColor: null,
  negativeColor: null,
  setFlowColors: () => {},
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
  const [positiveColor, setPositiveColor] = useState<FlowColor | null>(null);
  const [negativeColor, setNegativeColor] = useState<FlowColor | null>(null);
  const userIdRef = useRef<string | null>(null);
  const themeRevisionRef = useRef(0);
  const themeRef = useRef<ThemeId>(DEFAULT_THEME);

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
    const revisionAtStart = themeRevisionRef.current;
    void getUserPreferences().then((preferences) => {
      if (!preferences) return;
      userIdRef.current = preferences.user_id;
      const serverTheme = pickFrom(THEMES, preferences.theme ?? undefined, DEFAULT_THEME) as ThemeId;
      const localTheme = readThemeSync();
      const serverUpdatedAt = Date.parse(String(preferences.updated_at ?? ""));
      const localThemeIsNewer = localTheme !== null
        && localTheme.userId === preferences.user_id
        && THEMES.some((item) => item.id === localTheme.theme)
        && Number(localTheme.updatedAt) > (Number.isFinite(serverUpdatedAt) ? serverUpdatedAt : 0);
      const changedWhileLoading = themeRevisionRef.current !== revisionAtStart;
      const nextTheme = changedWhileLoading
        ? themeRef.current
        : localThemeIsNewer
          ? localTheme?.theme as ThemeId
          : serverTheme;
      const nextRadius = pickFrom(RADII, preferences.radius ?? undefined, DEFAULT_RADIUS) as RadiusId;
      const nextMode = (MODES.includes(preferences.mode as ModeId) ? preferences.mode : "system") as ModeId;
      const nextPositive = preferences.positive_color as FlowColor | null;
      const nextNegative = preferences.negative_color as FlowColor | null;
      setThemeState(nextTheme);
      themeRef.current = nextTheme;
      setRadiusState(nextRadius);
      setModeState(nextMode);
      setResolved(resolve(nextMode));
      setPositiveColor(nextPositive);
      setNegativeColor(nextNegative);
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.dataset.radius = nextRadius;
      document.documentElement.dataset.mode = resolve(nextMode);
      remember(THEME_KEY, nextTheme);
      rememberThemeSync(nextTheme, preferences.user_id, localThemeIsNewer || changedWhileLoading ? Date.now() : (Number.isFinite(serverUpdatedAt) ? serverUpdatedAt : Date.now()));
      if (nextPositive) {
        document.documentElement.style.setProperty("--positive", nextPositive);
        document.documentElement.style.setProperty("--chart-income", `hsl(${nextPositive})`);
      }
      if (nextNegative) {
        document.documentElement.style.setProperty("--negative", nextNegative);
        document.documentElement.style.setProperty("--chart-expense", `hsl(${nextNegative})`);
      }
      if (localThemeIsNewer || changedWhileLoading) queuePreferenceSave({ theme: nextTheme });
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
    themeRevisionRef.current += 1;
    themeRef.current = next;
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    remember(THEME_KEY, next);
    rememberThemeSync(next, userIdRef.current);
    queuePreferenceSave({ theme: next });
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

  const setFlowColors = useCallback((positive: FlowColor | null, negative: FlowColor | null) => {
    setPositiveColor(positive);
    setNegativeColor(negative);
    const root = document.documentElement;
    if (positive) {
      root.style.setProperty("--positive", positive);
      root.style.setProperty("--chart-income", `hsl(${positive})`);
    } else {
      root.style.removeProperty("--positive");
      root.style.removeProperty("--chart-income");
    }
    if (negative) {
      root.style.setProperty("--negative", negative);
      root.style.setProperty("--chart-expense", `hsl(${negative})`);
    } else {
      root.style.removeProperty("--negative");
      root.style.removeProperty("--chart-expense");
    }
    void saveUserPreferences({ positiveColor: positive, negativeColor: negative });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mode, radius, resolvedMode, setTheme, setMode, setRadius, positiveColor, negativeColor, setFlowColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
