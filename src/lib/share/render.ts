/**
 * Penggambar utama kartu Share Story ke Canvas 2D.
 * Satu fungsi dipakai untuk pratinjau, thumbnail, dan file PNG akhir, jadi apa yang terlihat = apa yang tersimpan.
 */
import { avatar, card, drawCover, fillRR, glow, getFontFamily, hashString, lin, mulberry32, rgba, rrPath, setFont, setFontFamily, soft, sparkle4, txt, drawQr } from "./canvas";
import { makeQr, type QrCode } from "./qr";
import { tBalance, tCashflow, tGoal, tGoals, tMilestone, tTrend, type R } from "./templates-a";
import { tAchievements, tCategories, tCouple, tMonthly, tQuote, tReceipt, tStreak } from "./templates-b";
import { FORMAT_SIZE, type PatternId, type ShareAssets, type ShareData, type ShareStyle, type TemplateId } from "./types";
import { themeById } from "./themes";

const DRAW: Record<TemplateId, (r: R, a: { x: number; y: number; w: number; h: number }) => void> = {
  balance: tBalance,
  trend: tTrend,
  cashflow: tCashflow,
  goal: tGoal,
  goals: tGoals,
  milestone: tMilestone,
  achievements: tAchievements,
  categories: tCategories,
  couple: tCouple,
  monthly: tMonthly,
  streak: tStreak,
  receipt: tReceipt,
  quote: tQuote,
};

const MX = 72;

const qrCache = new Map<string, QrCode>();
function qrFor(url: string) {
  let q = qrCache.get(url);
  if (!q) {
    try {
      q = makeQr(url, "M");
      qrCache.set(url, q);
    } catch {
      return null;
    }
  }
  return q;
}

export function hostOf(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/* ── latar & pola ───────────────────────────────────────── */

function drawPattern(ctx: CanvasRenderingContext2D, p: PatternId, W: number, H: number, ink: string, accent: string, seed: number) {
  if (p === "none") return;
  ctx.save();
  if (p === "dots") {
    ctx.fillStyle = rgba(ink, 0.11);
    for (let y = 30; y < H; y += 54) for (let x = ((y / 54) % 2) * 27 + 20; x < W; x += 54) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p === "grid") {
    ctx.strokeStyle = rgba(ink, 0.07);
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  } else if (p === "waves") {
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const base = H * (0.08 + i * 0.115);
      for (let x = 0; x <= W; x += 12) {
        const y = base + Math.sin(x / 150 + i * 0.7) * 46 + Math.sin(x / 61 + i) * 12;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(i % 2 ? accent : ink, 0.13);
      ctx.stroke();
    }
  } else if (p === "sparkles") {
    const rnd = mulberry32(seed);
    for (let i = 0; i < 34; i++) sparkle4(ctx, rnd() * W, rnd() * H, 8 + rnd() * 22, rgba(i % 3 ? ink : accent, 0.14 + rnd() * 0.3));
  } else if (p === "rings") {
    ctx.strokeStyle = rgba(ink, 0.09);
    ctx.lineWidth = 3;
    for (let i = 1; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(W * 0.92, H * 0.94, i * 150, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(accent, 0.12);
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(W * 0.05, H * 0.06, i * 170, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBackground(r: R) {
  const { ctx, t, s, W, H } = r;
  ctx.fillStyle = lin(ctx, 0, 0, W * 0.7, H, [[0, t.bg[0]], [0.55, t.bg[1]], [1, t.bg[2]]]);
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W * 0.92, H * 0.1, W * 0.75, t.glowA, t.dark ? 0.32 : 0.55);
  glow(ctx, W * 0.05, H * 0.92, W * 0.85, t.glowB, t.dark ? 0.3 : 0.4);

  const bg = r.a.bg;
  if (bg && bg.naturalWidth) {
    drawCover(ctx, bg, 0, 0, W, H);
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, rgba(t.bg[0], 0.72)], [0.5, rgba(t.bg[1], 0.62)], [1, rgba(t.bg[2], 0.88)]]);
    ctx.fillRect(0, 0, W, H);
  }
  drawPattern(ctx, s.pattern, W, H, t.ink, t.accent, hashString(s.template + s.theme));
}

/* ── header & footer ────────────────────────────────────── */

function drawHeader(r: R, y: number) {
  const { ctx, t, d, a } = r;
  const size = 76;
  if (a.logo && a.logo.naturalWidth) {
    ctx.save();
    ctx.shadowColor = rgba("#000000", 0.35);
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    rrPath(ctx, MX, y, size, size, 20);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();
    ctx.save();
    rrPath(ctx, MX, y, size, size, 20);
    ctx.clip();
    ctx.drawImage(a.logo, MX, y, size, size);
    ctx.restore();
  } else {
    fillRR(ctx, MX, y, size, size, 20, lin(ctx, MX, y, MX + size, y + size, [[0, t.accent2], [1, t.accent]]));
    txt(ctx, "K", MX + size / 2, y + size / 2 + 2, { size: 46, weight: 800, color: t.dark ? "#0B0B1E" : "#fff", align: "center", base: "middle" });
  }
  txt(ctx, "KITA", MX + size + 24, y + 34, { size: 44, weight: 800, color: t.ink, track: 7, base: "middle" });
  txt(ctx, "Keuangan berdua", MX + size + 24, y + 66, { size: 23, weight: 600, color: soft(t, 0.65), base: "middle" });

  if (r.s.showAvatars && r.s.template !== "couple") {
    const rr = 34;
    const ms = d.members.slice(0, 2);
    ms.forEach((m, i) => avatar(ctx, t, a.avatars[m.key] ?? null, m.name, r.W - MX - rr - (ms.length - 1 - i) * rr * 1.25, y + size / 2, rr));
  }
}

function drawFooter(r: R, y: number, h: number) {
  const { ctx, t, d, s } = r;
  const x = MX;
  const w = r.W - MX * 2;
  card(ctx, t, s.cardStyle === "line" ? "line" : "glass", x, y, w, h, 52);

  const host = hostOf(d.appUrl);
  const caption = s.caption.trim();
  let tx = x + 44;
  let tw = w - 88;

  if (s.showQr && r.qr) {
    const plate = h - 40;
    const px = x + 22;
    const py = y + 20;
    ctx.save();
    ctx.shadowColor = rgba("#000000", 0.25);
    ctx.shadowBlur = 20;
    fillRR(ctx, px, py, plate, plate, 30, "#FFFFFF");
    ctx.restore();
    const pad = 16;
    drawQr(ctx, r.qr.modules, px + pad, py + pad, plate - pad * 2, "#0B0B1E");
    tx = px + plate + 34;
    tw = x + w - 40 - tx;
  }

  const l1 = caption || "Kelola keuangan berdua";
  txt(ctx, l1, tx, y + h * 0.36, { size: 38, weight: 800, color: t.ink, base: "middle", max: tw });
  txt(ctx, host, tx, y + h * 0.62, { size: 36, weight: 800, color: t.accent, base: "middle", max: tw });
  txt(ctx, s.showQr ? "Scan QR untuk mulai bareng" : "Buka dari browser atau Layar Utama", tx, y + h * 0.84, { size: 24, weight: 600, color: soft(t, 0.65), base: "middle", max: tw });
}

/* ── titik masuk ────────────────────────────────────────── */

/**
 * Gambar satu kartu penuh ke `ctx`. Kanvas harus berukuran FORMAT_SIZE[format]; untuk thumbnail cukup
 * `ctx.scale()` sebelum memanggil fungsi ini.
 */
export function renderShare(ctx: CanvasRenderingContext2D, style: ShareStyle, data: ShareData, assets: ShareAssets) {
  const { w: W, h: H } = FORMAT_SIZE[style.format];
  const t = themeById(style.theme);
  const r: R = { ctx, t, s: style, d: data, a: assets, W, H, hide: style.hideAmounts, qr: style.showQr ? qrFor(data.appUrl) : null };

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(r);

  // Story: hindari area yang tertutup UI Instagram (atas ~250 px, bawah ~250 px).
  const safeTop = style.format === "story" ? 250 : 84;
  const safeBottom = style.format === "story" ? 250 : 84;
  const footerH = style.showQr ? 208 : 158;
  const headerH = 76;

  drawHeader(r, safeTop);
  const footerY = H - safeBottom - footerH;
  drawFooter(r, footerY, footerH);

  const top = safeTop + headerH + 34;
  const bottom = footerY - 34;
  DRAW[style.template](r, { x: MX, y: top, w: W - MX * 2, h: bottom - top });
  ctx.restore();
}

/* ── util pemuatan ──────────────────────────────────────── */

export function loadImage(src: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Pastikan huruf aplikasi sudah termuat sebelum menggambar (canvas tidak menunggu font seperti DOM). */
export async function prepareFonts() {
  let family = getFontFamily();
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--font-jakarta").trim();
    if (v) family = `${v}, system-ui, -apple-system, "Segoe UI", sans-serif`;
    setFontFamily(family);
    if (document.fonts?.load) {
      await Promise.all([
        ...[500, 600, 700, 800].map((w) => document.fonts.load(`${w} 40px ${family}`, "Rp0123456789Aa")),
        document.fonts.load(`italic 700 40px ${family}`, "Aa"),
      ]);
    }
  } catch {
    /* pakai huruf cadangan */
  }
  return family;
}
