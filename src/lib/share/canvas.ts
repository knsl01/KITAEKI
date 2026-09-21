/** Helper gambar Canvas 2D untuk kartu Share Story. Semua koordinat dalam ruang logis 1080 px lebar. */
import type { CardStyle, ShareTheme } from "./types";

export type C = CanvasRenderingContext2D;
export type Box = { x: number; y: number; w: number; h: number };

let FAMILY = '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
export const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
export function setFontFamily(f: string) {
  FAMILY = f;
}
export function getFontFamily() {
  return FAMILY;
}

/* ── warna ──────────────────────────────────────────────── */

export function rgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* ── format angka & tanggal ─────────────────────────────── */

const group = (n: number) => Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function idr(n: number) {
  return (n < 0 ? "-" : "") + "Rp" + group(n);
}

export function idrCompact(n: number) {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const dec = (v: number) => (Math.round(v * 10) / 10).toString().replace(".", ",");
  if (a >= 1e12) return `${sign}Rp${dec(a / 1e12)} T`;
  if (a >= 1e9) return `${sign}Rp${dec(a / 1e9)} M`;
  if (a >= 1e6) return `${sign}Rp${dec(a / 1e6)} jt`;
  if (a >= 1e3) return `${sign}Rp${Math.round(a / 1e3)} rb`;
  return idr(n);
}

export const HIDDEN = "Rp ••••••";
export const money = (n: number, hide: boolean) => (hide ? HIDDEN : idr(n));
export const moneyC = (n: number, hide: boolean) => (hide ? "Rp •••" : idrCompact(n));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export function shortDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
export function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

/* ── path & bentuk ──────────────────────────────────────── */

export function rrPath(ctx: C, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function fillRR(ctx: C, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) {
  rrPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function lin(ctx: C, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export function glow(ctx: C, cx: number, cy: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

/* ── teks ───────────────────────────────────────────────── */

export type TextOpts = {
  size: number;
  weight?: number;
  color?: string | CanvasGradient;
  align?: "left" | "center" | "right";
  base?: CanvasTextBaseline;
  italic?: boolean;
  track?: number;
  alpha?: number;
  /** Kecilkan otomatis kalau lebih lebar dari ini. */
  max?: number;
  family?: string;
};

export function setFont(ctx: C, size: number, weight = 600, italic = false, family = FAMILY) {
  ctx.font = `${italic ? "italic " : ""}${weight} ${size}px ${family}`;
}

/** Ukuran font terbesar (≤ size) yang muat dalam `max` lebar. */
export function fitSize(ctx: C, s: string, weight: number, max: number, size: number, min = 18, family = FAMILY, italic = false) {
  let sz = size;
  setFont(ctx, sz, weight, italic, family);
  const w = ctx.measureText(s).width;
  if (w > max) sz = Math.max(min, Math.floor((size * max) / w));
  return sz;
}

export function txt(ctx: C, s: string, x: number, y: number, o: TextOpts) {
  const weight = o.weight ?? 600;
  let size = o.size;
  if (o.max) size = fitSize(ctx, s, weight, o.max, size, 14, o.family ?? FAMILY, !!o.italic);
  setFont(ctx, size, weight, !!o.italic, o.family ?? FAMILY);
  ctx.textBaseline = o.base ?? "alphabetic";
  ctx.fillStyle = o.color ?? "#fff";
  const prevAlpha = ctx.globalAlpha;
  if (o.alpha != null) ctx.globalAlpha = prevAlpha * o.alpha;

  let width: number;
  if (o.track) {
    const chars = Array.from(s);
    const widths = chars.map((c) => ctx.measureText(c).width);
    width = widths.reduce((a, b) => a + b, 0) + o.track * (chars.length - 1);
    let cx = o.align === "center" ? x - width / 2 : o.align === "right" ? x - width : x;
    ctx.textAlign = "left";
    chars.forEach((c, i) => {
      ctx.fillText(c, cx, y);
      cx += widths[i] + o.track!;
    });
  } else {
    ctx.textAlign = o.align ?? "left";
    width = ctx.measureText(s).width;
    ctx.fillText(s, x, y);
  }
  ctx.globalAlpha = prevAlpha;
  return width;
}

export function measure(ctx: C, s: string, size: number, weight = 600, italic = false, family = FAMILY) {
  setFont(ctx, size, weight, italic, family);
  return ctx.measureText(s).width;
}

export function wrap(ctx: C, s: string, max: number, size: number, weight = 600, italic = false, maxLines = 99) {
  setFont(ctx, size, weight, italic);
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width <= max || !cur) cur = test;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + "…").width > max) last = last.slice(0, -1);
    kept[maxLines - 1] = last.replace(/[\s,.;:]+$/, "") + "…";
    return kept;
  }
  return lines;
}

/* ── kartu, pill, avatar ────────────────────────────────── */

export function soft(t: ShareTheme, a = 0.68) {
  return rgba(t.ink, a);
}

export function card(ctx: C, t: ShareTheme, style: CardStyle, x: number, y: number, w: number, h: number, r = 44) {
  ctx.save();
  if (style === "glass") {
    ctx.shadowColor = rgba("#000000", t.dark ? 0.35 : 0.12);
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 18;
    fillRR(ctx, x, y, w, h, r, t.dark ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.58)");
    ctx.shadowColor = "transparent";
    rrPath(ctx, x, y, w, h, r);
    ctx.strokeStyle = t.dark ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // kilau tipis di tepi atas
    ctx.save();
    rrPath(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.fillStyle = lin(ctx, x, y, x, y + Math.min(h, 160), [[0, t.dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.5)"], [1, "rgba(255,255,255,0)"]]);
    ctx.fillRect(x, y, w, Math.min(h, 160));
    ctx.restore();
  } else if (style === "solid") {
    ctx.shadowColor = rgba("#000000", 0.3);
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    fillRR(ctx, x, y, w, h, r, rgba(t.solid, t.dark ? 0.92 : 0.96));
    ctx.shadowColor = "transparent";
    rrPath(ctx, x, y, w, h, r);
    ctx.strokeStyle = rgba(t.ink, 0.08);
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    fillRR(ctx, x, y, w, h, r, rgba(t.ink, 0.04));
    rrPath(ctx, x, y, w, h, r);
    ctx.strokeStyle = rgba(t.ink, 0.55);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

/** Teks di dalam kartu solid berwarna terang harus tetap terbaca: kartu solid memakai ink tema seperti biasa. */
export function pill(ctx: C, t: ShareTheme, cx: number, y: number, label: string, o: { color?: string; size?: number; h?: number; icon?: "up" | "down" | null; fill?: string } = {}) {
  const size = o.size ?? 32;
  const h = o.h ?? size * 2;
  const color = o.color ?? t.ink;
  setFont(ctx, size, 700);
  const tw = ctx.measureText(label).width;
  const iconW = o.icon ? size * 0.9 : 0;
  const w = tw + iconW + size * 1.6;
  const x = cx - w / 2;
  fillRR(ctx, x, y, w, h, h / 2, o.fill ?? rgba(color, 0.16));
  rrPath(ctx, x, y, w, h, h / 2);
  ctx.strokeStyle = rgba(color, 0.35);
  ctx.lineWidth = 2;
  ctx.stroke();
  let tx = x + size * 0.8;
  if (o.icon) {
    triangle(ctx, tx + size * 0.32, y + h / 2, size * 0.32, o.icon === "up", color);
    tx += iconW;
  }
  txt(ctx, label, tx, y + h / 2, { size, weight: 700, color, base: "middle" });
  return { x, w, h };
}

export function triangle(ctx: C, cx: number, cy: number, r: number, up: boolean, color: string) {
  ctx.beginPath();
  if (up) {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 1.1, cy + r * 0.8);
    ctx.lineTo(cx - r * 1.1, cy + r * 0.8);
  } else {
    ctx.moveTo(cx, cy + r);
    ctx.lineTo(cx + r * 1.1, cy - r * 0.8);
    ctx.lineTo(cx - r * 1.1, cy - r * 0.8);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function avatar(ctx: C, t: ShareTheme, img: HTMLImageElement | null, name: string, cx: number, cy: number, r: number, ring = true) {
  ctx.save();
  if (ring) {
    ctx.shadowColor = rgba("#000000", 0.35);
    ctx.shadowBlur = r * 0.5;
    ctx.shadowOffsetY = r * 0.18;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, cx - r, cy - r, cx + r, cy + r, [[0, t.accent], [1, t.accent2]]);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - (ring ? 5 : 0), 0, Math.PI * 2);
  ctx.clip();
  if (img && img.naturalWidth) {
    const s = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = lin(ctx, cx - r, cy - r, cx + r, cy + r, [[0, t.accent], [1, t.accent2]]);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    txt(ctx, (name || "?").trim().charAt(0).toUpperCase(), cx, cy + r * 0.04, { size: r * 1.0, weight: 800, color: t.dark ? "#0B0B1E" : "#fff", align: "center", base: "middle" });
  }
  ctx.restore();

  if (ring) {
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2.5, 0, Math.PI * 2);
    ctx.strokeStyle = t.dark ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.95)";
    ctx.lineWidth = 5;
    ctx.stroke();
  }
}

/** Gambar foto dengan mode "cover" di dalam kotak. */
export function drawCover(ctx: C, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * s;
  const ih = img.naturalHeight * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

/* ── grafik ─────────────────────────────────────────────── */

type Pt = { x: number; y: number };

function smoothPath(ctx: C, pts: Pt[]) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) * t, p1.y + (p2.y - p0.y) * t, p2.x - (p3.x - p1.x) * t, p2.y - (p3.y - p1.y) * t, p2.x, p2.y);
  }
}

export type ChartOpts = { lineWidth?: number; fill?: boolean; dot?: boolean; min?: number; max?: number };

/** Grafik area halus. Mengembalikan konversi nilai → posisi supaya pemanggil bisa menambah label. */
export function areaChart(ctx: C, t: ShareTheme, values: number[], b: Box, o: ChartOpts = {}) {
  const n = values.length;
  const lo0 = o.min ?? Math.min(...values);
  const hi0 = o.max ?? Math.max(...values);
  const span = hi0 - lo0 || Math.max(Math.abs(hi0), 1) * 0.1;
  const lo = lo0 - span * 0.12;
  const hi = hi0 + span * 0.12;
  const px = (i: number) => b.x + (n === 1 ? b.w / 2 : (i / (n - 1)) * b.w);
  const py = (v: number) => b.y + b.h - ((v - lo) / (hi - lo)) * b.h;
  const pts = values.map((v, i) => ({ x: px(i), y: py(v) }));

  if (n >= 2) {
    if (o.fill !== false) {
      ctx.save();
      ctx.beginPath();
      smoothPath(ctx, pts);
      ctx.lineTo(pts[n - 1].x, b.y + b.h);
      ctx.lineTo(pts[0].x, b.y + b.h);
      ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, b.y, 0, b.y + b.h, [[0, rgba(t.accent, 0.5)], [1, rgba(t.accent, 0)]]);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath();
    smoothPath(ctx, pts);
    ctx.lineWidth = o.lineWidth ?? 9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = lin(ctx, b.x, 0, b.x + b.w, 0, [[0, t.accent2], [1, t.accent]]);
    ctx.shadowColor = rgba(t.accent, 0.55);
    ctx.shadowBlur = 24;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(b.x, pts[0].y);
    ctx.lineTo(b.x + b.w, pts[0].y);
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  if (o.dot !== false) {
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 26, 0, Math.PI * 2);
    ctx.fillStyle = rgba(t.accent, 0.25);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = t.dark ? "#fff" : t.ink;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = t.accent;
    ctx.stroke();
  }
  return { px, py, pts };
}

export function ring(ctx: C, t: ShareTheme, cx: number, cy: number, r: number, thick: number, frac: number, colors?: [string, string]) {
  const f = Math.max(0, Math.min(1, frac));
  ctx.save();
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = thick;
  ctx.strokeStyle = rgba(t.ink, t.dark ? 0.14 : 0.12);
  ctx.stroke();
  if (f > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
    ctx.lineWidth = thick;
    const [c1, c2] = colors ?? [t.accent2, t.accent];
    ctx.strokeStyle = lin(ctx, cx - r, cy + r, cx + r, cy - r, [[0, c1], [1, c2]]);
    ctx.shadowColor = rgba(c2, 0.6);
    ctx.shadowBlur = 30;
    ctx.stroke();
  }
  ctx.restore();
}

export function progressBar(ctx: C, t: ShareTheme, x: number, y: number, w: number, h: number, frac: number) {
  fillRR(ctx, x, y, w, h, h / 2, rgba(t.ink, t.dark ? 0.16 : 0.12));
  const fw = Math.max(h, w * Math.max(0, Math.min(1, frac)));
  if (frac > 0) {
    ctx.save();
    ctx.shadowColor = rgba(t.accent, 0.5);
    ctx.shadowBlur = 18;
    fillRR(ctx, x, y, fw, h, h / 2, lin(ctx, x, 0, x + w, 0, [[0, t.accent2], [1, t.accent]]));
    ctx.restore();
  }
}

export function donut(ctx: C, cx: number, cy: number, r: number, thick: number, parts: { value: number; color: string }[]) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const gap = parts.length > 1 ? 0.035 : 0;
  let a0 = -Math.PI / 2;
  ctx.save();
  ctx.lineWidth = thick;
  ctx.lineCap = "butt";
  parts.forEach((p) => {
    const sweep = (p.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0 + gap / 2, a0 + sweep - gap / 2);
    ctx.strokeStyle = p.color;
    ctx.stroke();
    a0 += sweep;
  });
  ctx.restore();
}

/* ── ikon vektor (grid 24) ──────────────────────────────── */

const P = (d: string) => new Path2D(d);
type IconDef = { fill?: Path2D[]; stroke?: Path2D[]; cut?: Path2D[] };
let ICONS: Record<string, IconDef> | null = null;

function icons() {
  if (ICONS) return ICONS;
  ICONS = {
    heart: { fill: [P("M12 21.2C6 17 2.2 13.2 2.2 8.9 2.2 6.1 4.3 4 7 4c1.9 0 3.7 1 5 2.9C13.3 5 15.1 4 17 4c2.7 0 4.8 2.1 4.8 4.9 0 4.3-3.800 8.100-9.800 12.300z")] },
    flame: { fill: [P("M12 1.5C12.6 6 18.6 8.6 18.6 15a6.6 6.6 0 0 1-13.200 0c0-2.900 1.500-4.800 2.900-6.600.4 1.500 1.100 2.300 2.100 2.700C10.700 8.100 11 4.600 12 1.500z")], cut: [P("M12 22a3.300 3.300 0 0 1-3.300-3.300c0-1.800 1.300-2.800 2-4.200.5.900 1.300 1.300 1.900 1.900.9.900 2.700 1.600 2.700 3.600A3.300 3.300 0 0 1 12 22z")] },
    trophy: { fill: [P("M6.500 2.500h11v6.300a5.500 5.500 0 0 1-11 0z"), P("M10.800 14h2.400v4h-2.400z"), P("M7.500 19.500h9a1 1 0 0 1 1 1v1.500h-11v-1.500a1 1 0 0 1 1-1z")], stroke: [P("M6.500 5H3.500c0 3 1 5 3.300 5.400"), P("M17.500 5h3c0 3-1 5-3.300 5.400")] },
    shield: { fill: [P("M12 1.800l8.200 3v6.400c0 5.200-3.500 9.200-8.200 11-4.700-1.800-8.200-5.800-8.200-11V4.800z")], cut: [P("M8.200 11.800l2.700 2.700 5-5.400-1.400-1.300-3.600 3.900-1.300-1.300z")] },
    trend: { stroke: [P("M2.500 17l6.500-6.500 4 4 8-8.500"), P("M15.500 6h6v6")] },
    down: { stroke: [P("M2.500 7l6.500 6.500 4-4 8 8.500"), P("M15.500 18h6v-6")] },
    crown: { fill: [P("M2.500 7.500l5 4.500 4.500-7 4.500 7 5-4.500-2 12h-15z")] },
    target: { stroke: [P("M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"), P("M12 6.500a5.500 5.500 0 1 0 0 11 5.500 5.500 0 0 0 0-11z")], fill: [P("M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z")] },
    bolt: { fill: [P("M13.500 1.500L4 13.500h6.500l-1 9 9.500-12h-6.500z")] },
    sparkle: { fill: [P("M12 1.500c.9 5.600 2.400 7.800 10.500 10.500-8.100 2.700-9.600 4.900-10.500 10.500C11.100 16.900 9.600 14.700 1.500 12 9.600 9.300 11.100 7.100 12 1.500z")] },
    lock: { fill: [P("M5 10.500h14a1 1 0 0 1 1 1V21a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.500a1 1 0 0 1 1-1z")], stroke: [P("M7.500 10.500V7.500a4.500 4.500 0 0 1 9 0v3")] },
    check: { stroke: [P("M4.500 12.500l5 5 10-11")] },
    piggy: { fill: [P("M19.500 9.500c-.5-1.200-1.400-2.100-2.500-2.700V4.500l-3 1.600a9 9 0 0 0-2-.2c-4.400 0-7.500 2.700-7.500 6.400 0 2 .8 3.600 2.200 4.700V19h3v-1.400c.6.100 1.200.2 1.800.2s1.200-.1 1.800-.2V19h3v-2.800c1-.8 1.700-1.800 2-3H22v-3.700z")] },
  };
  return ICONS;
}

export function icon(ctx: C, name: string, cx: number, cy: number, size: number, color: string, opts: { cutColor?: string; lineWidth?: number } = {}) {
  const def = icons()[name];
  if (!def) return;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = opts.lineWidth ?? 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  def.fill?.forEach((p) => ctx.fill(p));
  def.stroke?.forEach((p) => ctx.stroke(p));
  if (def.cut) {
    ctx.fillStyle = opts.cutColor ?? "rgba(0,0,0,0.45)";
    def.cut.forEach((p) => ctx.fill(p));
  }
  ctx.restore();
}

export function sparkle4(ctx: C, cx: number, cy: number, r: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fillStyle = color;
  ctx.fill();
}

/* ── QR ─────────────────────────────────────────────────── */

export function drawQr(ctx: C, modules: boolean[][], x: number, y: number, size: number, fg: string) {
  const n = modules.length;
  const m = size / n;
  ctx.fillStyle = fg;
  const finder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!modules[r][c] || finder(r, c)) continue;
      rrPath(ctx, x + c * m + m * 0.04, y + r * m + m * 0.04, m * 0.92, m * 0.92, m * 0.28);
      ctx.fill();
    }
  }
  // Tiga pola sudut digambar sebagai kotak bersarang bersudut membulat (tetap terbaca semua pemindai).
  const eye = (r0: number, c0: number) => {
    const ex = x + c0 * m;
    const ey = y + r0 * m;
    rrPath(ctx, ex, ey, 7 * m, 7 * m, m * 1.9);
    ctx.fillStyle = fg;
    ctx.fill();
    rrPath(ctx, ex + m, ey + m, 5 * m, 5 * m, m * 1.2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    rrPath(ctx, ex + 2 * m, ey + 2 * m, 3 * m, 3 * m, m * 0.8);
    ctx.fillStyle = fg;
    ctx.fill();
  };
  eye(0, 0);
  eye(0, n - 7);
  eye(n - 7, 0);
}
