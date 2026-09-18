"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "sage", label: "Sage", swatch: "#3F5540" },
  { id: "deep-purple", label: "Deep purple", swatch: "#4B2E70" },
  { id: "deep-blue", label: "Deep blue", swatch: "#24406B" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "sage";
export const THEME_STORAGE_KEY = "kita-theme";

/** Dijalankan sebelum halaman digambar supaya tidak ada kedip warna. */
export const themeBootstrapScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var v=["sage","deep-purple","deep-blue"];document.documentElement.dataset.theme=v.indexOf(t)>-1?t:"${DEFAULT_THEME}";}catch(e){document.documentElement.dataset.theme="${DEFAULT_THEME}";}})();`;

type ThemeContextValue = { theme: ThemeId; setTheme: (theme: ThemeId) => void };

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const current = document.documentElement.dataset.theme as ThemeId | undefined;
    if (current && THEMES.some((t) => t.id === current)) setThemeState(current);
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // penyimpanan browser diblokir — tema tetap berlaku sampai tab ditutup
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
