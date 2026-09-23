export const THEMES = [
  { id: "sage", label: "Sage", swatch: "#3F5540", dark: "#14201A" },
  { id: "deep-purple", label: "Deep purple", swatch: "#4B2E70", dark: "#1B1226" },
  { id: "deep-blue", label: "Deep blue", swatch: "#24406B", dark: "#0F1724" },
  { id: "nebula", label: "Nebula", swatch: "#2B4EDB", dark: "#150B33", accent: "#9B6BFF" },
  { id: "burgundy", label: "Burgundy", swatch: "#6B2036", dark: "#1F0F15" },
  { id: "ocean", label: "Ocean", swatch: "#196978", dark: "#0C1719" },
  { id: "honey", label: "Honey", swatch: "#8D5311", dark: "#16110D" },
  { id: "graphite", label: "Graphite", swatch: "#272B35", dark: "#111319" },
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

export const DEFAULT_THEME: ThemeId = "sage";
export const DEFAULT_RADIUS: RadiusId = "soft";
export const THEME_KEY = "kita-theme";
export const MODE_KEY = "kita-mode";
export const RADIUS_KEY = "kita-radius";

/** Inline startup script used by the server layout before client hydration. */
export const themeBootstrapScript = `(function(){try{
var el=document.documentElement;
var ok=function(list,v,d){return list.indexOf(v)>-1?v:d;};
el.dataset.theme=ok(${JSON.stringify(THEMES.map((t) => t.id))},localStorage.getItem("${THEME_KEY}"),"${DEFAULT_THEME}");
el.dataset.radius=ok(${JSON.stringify(RADII.map((r) => r.id))},localStorage.getItem("${RADIUS_KEY}"),"${DEFAULT_RADIUS}");
var m=localStorage.getItem("${MODE_KEY}")||"system";
var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
el.dataset.mode=dark?"dark":"light";
}catch(e){var d=document.documentElement;d.dataset.theme="${DEFAULT_THEME}";d.dataset.radius="${DEFAULT_RADIUS}";d.dataset.mode="light";}})();`;
