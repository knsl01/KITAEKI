import type { ShareTheme } from "./types";

export const THEMES: ShareTheme[] = [
  { id: "aurora", label: "Aurora", dark: true, bg: ["#0B0B2E", "#2A1B8F", "#7B2FF7"], glowA: "#3BA0FF", glowB: "#FF4FD8", ink: "#FFFFFF", accent: "#7FD4FF", accent2: "#D28BFF", good: "#5CF2B0", bad: "#FF8FA3", solid: "#1B1660" },
  { id: "blackpink", label: "Black Pink", dark: true, bg: ["#050505", "#160A12", "#3A0A24"], glowA: "#FF2E93", glowB: "#FF7AB8", ink: "#FFFFFF", accent: "#FF2E93", accent2: "#FF9CCB", good: "#7CF5C0", bad: "#FF6B8B", solid: "#1A0F16" },
  { id: "sunset", label: "Sunset", dark: true, bg: ["#2B0B3F", "#B3226B", "#FF8A3D"], glowA: "#FFD166", glowB: "#7A3CFF", ink: "#FFFFFF", accent: "#FFE08A", accent2: "#FFB3D1", good: "#B6FF9E", bad: "#FFD1D1", solid: "#4B1650" },
  { id: "ocean", label: "Ocean", dark: true, bg: ["#031B2E", "#0B5C7A", "#12B5B0"], glowA: "#66F2E5", glowB: "#2E7BFF", ink: "#FFFFFF", accent: "#8CF3EA", accent2: "#9CC4FF", good: "#9CFFCB", bad: "#FFA9A9", solid: "#0A3D57" },
  { id: "forest", label: "Forest", dark: true, bg: ["#06231A", "#0F5B3E", "#4FBF7A"], glowA: "#B7F26B", glowB: "#19C3A0", ink: "#FFFFFF", accent: "#C9FF8A", accent2: "#8FFFD0", good: "#D6FF9E", bad: "#FFB0A0", solid: "#0B3B2A" },
  { id: "midnight", label: "Midnight Gold", dark: true, bg: ["#05070F", "#0C1430", "#1B2350"], glowA: "#F5C451", glowB: "#5A6BFF", ink: "#FFFFFF", accent: "#F5C451", accent2: "#FFE29A", good: "#7CF5C0", bad: "#FF8E8E", solid: "#111A3C" },
  { id: "rose", label: "Rose", dark: false, bg: ["#FFE3EC", "#FFC2D6", "#FF9EBF"], glowA: "#FFFFFF", glowB: "#FF6FA0", ink: "#4A0F2B", accent: "#E0356F", accent2: "#FF8FB5", good: "#0E9F6E", bad: "#D6336C", solid: "#FFF4F8" },
  { id: "cream", label: "Cream", dark: false, bg: ["#F8F3E8", "#EFE6D2", "#E2D5B8"], glowA: "#FFFFFF", glowB: "#C9B98F", ink: "#1F2A24", accent: "#2F6B4F", accent2: "#8FA88F", good: "#1F7A4D", bad: "#B5483A", solid: "#FFFBF2" },
  { id: "candy", label: "Candy", dark: false, bg: ["#E6DBFF", "#FFD6EE", "#FFE6C7"], glowA: "#FFFFFF", glowB: "#B79CFF", ink: "#2B1B5A", accent: "#7A4DFF", accent2: "#FF6FB5", good: "#12A37A", bad: "#E0446F", solid: "#FBF7FF" },
  { id: "mono", label: "Mono", dark: false, bg: ["#FFFFFF", "#F3F3F3", "#E4E4E4"], glowA: "#FFFFFF", glowB: "#BDBDBD", ink: "#0D0D0D", accent: "#0D0D0D", accent2: "#6B6B6B", good: "#0E8F5E", bad: "#C2362F", solid: "#FFFFFF" },
];

export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
