"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "sage", label: "Sage", swatch: "#3F5540", dark: "#14201A" },
  { id: "deep-purple", label: "Deep purple", swatch: "#4B2E70", dark: "#1B1226" },
  { id: "deep-blue", label: "Deep blue", swatch: "#24406B", dark: "#0F1724" },
  { id: "burgundy", label: "Burgundy", swatch: "#6B2036", dark: "#1F0F15" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type ModeId = "light" | "dark" | "system";

export const DEFAULT_THEME: ThemeId = "sage";
export const THEME_KEY = "kita-theme";
export const MODE_KEY = "kita-mode";

/** Dijalankan sebelum halaman digambar supaya tidak ada kedip warna. */
export const themeBootstrapScript = `(function(){try{
var el=document.documentElement;
var t=localStorage.getItem("${THEME_KEY}");
var v=["sage","deep-purple","deep-blue","burgundy"];
el.dataset.theme=v.indexOf(t)>-1?t:"${DEFAULT_THEME}";
var m=localStorage.getItem("${MODE_KEY}")||"system";
var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
el.dataset.mode=dark?"dark":"light";
}catch(e){document.documentElement.dataset.theme="${DEFAULT_THEME}";document.documentElement.dataset.mode="light";}})();`;

type ThemeContextValue = {
  theme: ThemeId;
  mode: ModeId;
  resolvedMode: "light" | "dark";
  setTheme: (theme: ThemeId) => void;
  setMode: (mode: ModeId) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  mode: "system",
  resolvedMode: "light",
  setTheme: () => {},
  setMode: () => {},
});

function resolve(mode: ModeId): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [mode, setModeState] = useState<ModeId>("system");
  const [resolvedMode, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const el = document.documentElement;
    const current = el.dataset.theme as ThemeId | undefined;
    if (current && THEMES.some((t) => t.id === current)) setThemeState(current);

    let storedMode: ModeId = "system";
    try {
      storedMode = (localStorage.getItem(MODE_KEY) as ModeId | null) ?? "system";
    } catch {
      storedMode = "system";
    }
    setModeState(storedMode);
    setResolved(resolve(storedMode));
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
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // penyimpanan browser diblokir — tema berlaku sampai tab ditutup
    }
  }, []);

  const setMode = useCallback((next: ModeId) => {
    setModeState(next);
    const actual = resolve(next);
    document.documentElement.dataset.mode = actual;
    setResolved(actual);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // idem
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mode, resolvedMode, setTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
