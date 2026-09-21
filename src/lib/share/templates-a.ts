/** Template kartu (bagian 1): saldo, grafik, arus kas, target, daftar target, milestone. */
import type { QrCode } from "./qr";
import type { ShareAssets, ShareData, ShareStyle, ShareTheme } from "./types";
import {
  areaChart, avatar, card, drawCover, fillRR, glow, hashString, icon, idr, lin, longDate, measure, moneyC, money, mulberry32, pill,
  progressBar, ring, rgba, rrPath, setFont, shortDate, soft, sparkle4, txt, wrap, type Box, type C, HIDDEN,
} from "./canvas";

export type R = {
  ctx: C;
  t: ShareTheme;
  s: ShareStyle;
  d: ShareData;
  a: ShareAssets;
  W: number;
  H: number;
  hide: boolean;
  qr: QrCode | null;
};

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function eyebrow(r: R, s: string, cx: number, y: number, color?: string, size = 28) {
  txt(r.ctx, s.toUpperCase(), cx, y, { size, weight: 800, track: size * 0.18, color: color ?? r.t.accent, align: "center" });
}

/** "Rp" kecil di sebelah angka besar, otomatis mengecil supaya muat. Mengembalikan lebar total. */
export function bigMoney(r: R, value: number, cx: number, baseline: number, size: number, maxW: number, color: string | CanvasGradient) {
  const { ctx } = r;
  if (r.hide) {
    txt(ctx, HIDDEN.replace("Rp ", "Rp "), cx, baseline, { size: size * 0.8, weight: 800, color, align: "center", max: maxW });
    return maxW;
  }
  const digits = Math.round(Math.abs(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = value < 0 ? "-" : "";
  const rpRatio = 0.4;
  const gap = 0.12;
  let sz = size;
  const total = (s: number) => measure(ctx, "Rp", s * rpRatio, 800) + s * gap + measure(ctx, sign + digits, s, 800);
  if (total(sz) > maxW) sz = Math.floor((sz * maxW) / total(sz));
  const w = total(sz);
  let x = cx - w / 2;
  txt(ctx, "Rp", x, baseline - sz * 0.46, { size: sz * rpRatio, weight: 800, color, alpha: 0.85 });
  x += measure(ctx, "Rp", sz * rpRatio, 800) + sz * gap;
  txt(ctx, sign + digits, x, baseline, { size: sz, weight: 800, color });
  return w;
}

export function goalProgress(g: { current: number; target: number }) {
  return g.target > 0 ? g.current / g.target : 0;
}

export function pickGoal(r: R, mode: "selected" | "closest") {
  const goals = r.d.goals;
  if (!goals.length) return null;
  if (mode === "selected" && r.s.goalId) {
    const g = goals.find((x) => x.id === r.s.goalId);
    if (g) return g;
  }
  const open = goals.filter((g) => goalProgress(g) < 1);
  const pool = mode === "closest" && open.length ? open : goals;
  return [...pool].sort((a, b) => goalProgress(b) - goalProgress(a))[0];
}

export function emptyState(r: R, a: Box, title: string, sub: string, ic = "target") {
  const { ctx, t } = r;
  const h = 420;
  const y = a.y + (a.h - h) / 2;
  card(ctx, t, r.s.cardStyle, a.x, y, a.w, h, 56);
  ctx.beginPath();
  ctx.arc(a.x + a.w / 2, y + 130, 74, 0, Math.PI * 2);
  ctx.fillStyle = rgba(t.accent, 0.2);
  ctx.fill();
  icon(ctx, ic, a.x + a.w / 2, y + 130, 84, t.accent);
  txt(ctx, title, a.x + a.w / 2, y + 268, { size: 50, weight: 800, color: t.ink, align: "center", max: a.w - 80 });
  txt(ctx, sub, a.x + a.w / 2, y + 330, { size: 32, weight: 500, color: soft(t), align: "center", max: a.w - 80 });
}

function rangeSeries(r: R) {
  const s = r.d.series;
  if (s.length < 2) return s;
  const [y, m, d] = r.d.today.split("-").map(Number);
  const cutoff = new Date(Date.UTC(y, m - 1, d - r.s.range)).toISOString().slice(0, 10);
  const from = s.findIndex((p) => p.date >= cutoff);
  return from <= 0 ? s : s.slice(from - 1 < 0 ? 0 : from - 1);
}

function delta(pts: { value: number }[]) {
  if (pts.length < 2) return null;
  const first = pts[0].value;
  const last = pts[pts.length - 1].value;
  const amount = last - first;
  return { amount, percent: first > 0 ? (amount / first) * 100 : null };
}

const pctText = (p: number) => `${p >= 0 ? "+" : "-"}${Math.abs(Math.round(p * 10) / 10).toString().replace(".", ",")}%`;

function deltaPill(r: R, cx: number, y: number, pts: { value: number }[], suffix: string) {
  const dl = delta(pts);
  if (!dl) return;
  const up = dl.amount >= 0;
  const color = up ? r.t.good : r.t.bad;
  const label = r.hide
    ? `${dl.percent != null ? pctText(dl.percent) : up ? "Naik" : "Turun"} · ${suffix}`
    : `${up ? "+" : "-"}${idr(Math.abs(dl.amount)).replace("-", "")}${dl.percent != null ? ` (${pctText(dl.percent)})` : ""} · ${suffix}`;
  pill(r.ctx, r.t, cx, y, label, { color, icon: up ? "up" : "down", size: 30, h: 62 });
}

/* ── 1. Saldo ───────────────────────────────────────────── */

export function tBalance(r: R, a: Box) {
  const { ctx, t, d } = r;
  const cx = a.x + a.w / 2;
  const pts = rangeSeries(r);
  const showStats = a.h >= 980;
  const statsH = showStats ? 24 + 150 : 0;
  const cardH = clamp(a.h - 330 - statsH, 300, 540);
  const hh = 330 + cardH + statsH;
  const y0 = a.y + (a.h - hh) / 2;

  eyebrow(r, "Total saldo kita", cx, y0 + 30);
  bigMoney(r, d.totalBalance, cx, y0 + 190, 150, a.w, t.ink);
  deltaPill(r, cx, y0 + 234, pts, `${r.s.range} hari`);

  const cy = y0 + 330;
  card(ctx, t, r.s.cardStyle, a.x, cy, a.w, cardH, 52);
  const box: Box = { x: a.x + 48, y: cy + 56, w: a.w - 96, h: cardH - 150 };
  if (pts.length >= 2) {
    areaChart(ctx, t, pts.map((p) => p.value), box);
    txt(ctx, shortDate(pts[0].date), box.x, cy + cardH - 40, { size: 27, weight: 600, color: soft(t, 0.6) });
    txt(ctx, "Hari ini", box.x + box.w, cy + cardH - 40, { size: 27, weight: 700, color: t.ink, align: "right" });
  } else {
    txt(ctx, "Grafik muncul setelah ada beberapa hari data", cx, cy + cardH / 2, { size: 32, weight: 500, color: soft(t), align: "center", base: "middle", max: a.w - 100 });
  }

  if (showStats) {
    const sy = cy + cardH + 24;
    const w = (a.w - 24) / 2;
    [
      { label: "Pemasukan bulan ini", v: d.income, c: t.good, up: true },
      { label: "Pengeluaran bulan ini", v: d.expense, c: t.bad, up: false },
    ].forEach((s, i) => {
      const x = a.x + i * (w + 24);
      card(ctx, t, r.s.cardStyle, x, sy, w, 150, 40);
      txt(ctx, s.label, x + 32, sy + 52, { size: 26, weight: 600, color: soft(t), max: w - 64 });
      txt(ctx, moneyC(s.v, r.hide), x + 32, sy + 112, { size: 52, weight: 800, color: s.c, max: w - 64 });
    });
  }
}

/* ── 2. Grafik saldo ────────────────────────────────────── */

export function tTrend(r: R, a: Box) {
  const { ctx, t, d } = r;
  const cx = a.x + a.w / 2;
  const pts = rangeSeries(r);
  const hh = Math.min(a.h, 940);
  const y0 = a.y + (a.h - hh) / 2;

  eyebrow(r, `Pertumbuhan saldo · ${r.s.range} hari`, cx, y0 + 30);
  bigMoney(r, d.totalBalance, cx, y0 + 150, 112, a.w, t.ink);
  deltaPill(r, cx, y0 + 190, pts, "periode ini");

  const cy = y0 + 290;
  const ch = hh - 290;
  card(ctx, t, r.s.cardStyle, a.x, cy, a.w, ch, 52);
  const left = r.hide ? 48 : 150;
  const box: Box = { x: a.x + left, y: cy + 70, w: a.w - left - 56, h: ch - 215 };

  if (pts.length < 2) {
    txt(ctx, "Belum cukup data untuk grafik", cx, cy + ch / 2, { size: 34, weight: 500, color: soft(t), align: "center", base: "middle" });
    return;
  }

  const vals = pts.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  // garis bantu + label sumbu Y
  for (let i = 0; i <= 3; i++) {
    const gy = box.y + (box.h * i) / 3;
    ctx.beginPath();
    ctx.moveTo(box.x, gy);
    ctx.lineTo(box.x + box.w, gy);
    ctx.strokeStyle = rgba(t.ink, 0.1);
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!r.hide) {
      const span = hi - lo || 1;
      const v = hi + span * 0.12 - ((hi - lo + span * 0.24) * i) / 3;
      txt(ctx, moneyC(v, false), box.x - 18, gy, { size: 24, weight: 600, color: soft(t, 0.55), align: "right", base: "middle" });
    }
  }
  const { px, py } = areaChart(ctx, t, vals, box);
  const iMax = vals.indexOf(hi);
  const iMin = vals.indexOf(lo);
  const tag = (i: number, label: string, above: boolean) => {
    const x = clamp(px(i), box.x + 140, box.x + box.w - 140);
    const y = py(vals[i]) + (above ? -50 : 56);
    pill(ctx, t, x, y - 24, label, { size: 22, h: 46, color: above ? t.good : t.bad });
  };
  if (iMax !== vals.length - 1 && hi !== lo) tag(iMax, r.hide ? "Tertinggi" : `Tertinggi ${moneyC(hi, false)}`, true);
  if (iMin !== 0 && hi !== lo) tag(iMin, r.hide ? "Terendah" : `Terendah ${moneyC(lo, false)}`, false);

  const ly = cy + ch - 40;
  txt(ctx, shortDate(pts[0].date), box.x, ly, { size: 27, weight: 600, color: soft(t, 0.6) });
  txt(ctx, shortDate(pts[Math.floor(pts.length / 2)].date), box.x + box.w / 2, ly, { size: 27, weight: 600, color: soft(t, 0.6), align: "center" });
  txt(ctx, "Hari ini", box.x + box.w, ly, { size: 27, weight: 700, color: t.ink, align: "right" });
}

/* ── 3. Arus kas ────────────────────────────────────────── */

export function tCashflow(r: R, a: Box) {
  const { ctx, t, d } = r;
  const cx = a.x + a.w / 2;
  const k = clamp(a.h / 960, 0.72, 1);
  const rr = 178 * k;
  const barsH = 250 * k;
  const hh = 60 + rr * 2 + 40 + barsH + 34 + 66 + 56;
  const y0 = a.y + (a.h - hh) / 2;

  eyebrow(r, `Arus kas · ${d.monthLabel}`, cx, y0 + 30);
  const ringY = y0 + 60 + rr + 20;
  const frac = d.savingsRate != null ? clamp(d.savingsRate / 100, 0, 1) : 0;
  ring(ctx, t, cx, ringY, rr, 48 * k, frac, d.savingsRate != null && d.savingsRate < 0 ? [t.bad, t.bad] : undefined);
  const label = d.savingsRate == null ? "–" : `${Math.round(d.savingsRate)}%`;
  txt(ctx, label, cx, ringY + 18 * k, { size: 112 * k, weight: 800, color: t.ink, align: "center", base: "middle", max: rr * 1.5 });
  txt(ctx, "tersisa", cx, ringY + 88 * k, { size: 30 * k, weight: 600, color: soft(t), align: "center" });

  const cy = ringY + rr + 48 * k;
  card(ctx, t, r.s.cardStyle, a.x, cy, a.w, barsH, 48);
  const mx = Math.max(d.income, d.expense, 1);
  [
    { label: "Pemasukan", v: d.income, c: t.good },
    { label: "Pengeluaran", v: d.expense, c: t.bad },
  ].forEach((row, i) => {
    const ry = cy + 34 * k + i * (barsH / 2 - 8 * k);
    txt(ctx, row.label, a.x + 44, ry + 36 * k, { size: 32 * k, weight: 700, color: soft(t, 0.85) });
    txt(ctx, moneyC(row.v, r.hide), a.x + a.w - 44, ry + 38 * k, { size: 42 * k, weight: 800, color: row.c, align: "right" });
    const bw = a.w - 88;
    fillRR(ctx, a.x + 44, ry + 60 * k, bw, 24 * k, 12 * k, rgba(t.ink, 0.12));
    fillRR(ctx, a.x + 44, ry + 60 * k, Math.max(24 * k, (bw * row.v) / mx), 24 * k, 12 * k, row.c);
  });

  const py = cy + barsH + 34;
  const up = d.net >= 0;
  pill(ctx, t, cx, py, r.hide ? (up ? "Bulan ini surplus" : "Bulan ini defisit") : `${up ? "Sisa" : "Kurang"} ${money(Math.abs(d.net), false)} bulan ini`, { color: up ? t.good : t.bad, size: 32, h: 66, icon: up ? "up" : "down" });
  if (d.expenseTrend != null) {
    const less = d.expenseTrend < 0;
    txt(ctx, `Pengeluaran ${less ? "turun" : "naik"} ${Math.abs(Math.round(d.expenseTrend))}% dari bulan lalu`, cx, py + 66 + 44, { size: 28, weight: 600, color: soft(t, 0.75), align: "center" });
  }
}

/* ── 4. Target (satu) ───────────────────────────────────── */

export function tGoal(r: R, a: Box) {
  const { ctx, t } = r;
  const g = pickGoal(r, "selected");
  if (!g) return emptyState(r, a, "Belum ada target tabungan", "Buat target di menu Tabungan & Target");
  const cx = a.x + a.w / 2;
  const k = clamp(a.h / 1010, 0.68, 1);
  const frac = goalProgress(g);
  const rr = 236 * k;
  const nameLines = wrap(ctx, g.name, a.w - 40, 64 * k, 800, false, 2);
  const hh = 50 + rr * 2 + 70 + nameLines.length * 74 * k + 26 + 128 * k + 34 + 64;
  const y0 = a.y + (a.h - hh) / 2;

  eyebrow(r, frac >= 1 ? "Target tercapai" : "Target tabungan", cx, y0 + 30);
  const ringY = y0 + 60 + rr + 16;
  const thick = 54 * k;
  ring(ctx, t, cx, ringY, rr, thick, frac);

  const img = r.a.goals[g.id];
  const innerR = rr - thick / 2 - 18 * k;
  if (img && img.naturalWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, ringY, innerR, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, img, cx - innerR, ringY - innerR, innerR * 2, innerR * 2);
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(cx - innerR, ringY - innerR, innerR * 2, innerR * 2);
    ctx.restore();
    txt(ctx, `${Math.round(frac * 100)}%`, cx, ringY, { size: 130 * k, weight: 800, color: "#fff", align: "center", base: "middle" });
  } else {
    txt(ctx, `${Math.round(frac * 100)}`, cx - 20 * k, ringY + 10 * k, { size: 170 * k, weight: 800, color: t.ink, align: "center", base: "middle" });
    const w = measure(ctx, `${Math.round(frac * 100)}`, 170 * k, 800);
    txt(ctx, "%", cx - 20 * k + w / 2 + 6, ringY - 18 * k, { size: 70 * k, weight: 800, color: t.accent, base: "middle" });
    txt(ctx, "tercapai", cx, ringY + 100 * k, { size: 28 * k, weight: 600, color: soft(t), align: "center" });
  }

  let y = ringY + rr + 48 * k + 40;
  nameLines.forEach((ln, i) => txt(ctx, ln, cx, y + i * 74 * k, { size: 64 * k, weight: 800, color: t.ink, align: "center" }));
  y += nameLines.length * 74 * k - 20;

  const w2 = (a.w - 24) / 2;
  [
    { label: "Terkumpul", v: g.current },
    { label: "Target", v: g.target },
  ].forEach((s, i) => {
    const x = a.x + i * (w2 + 24);
    card(ctx, t, r.s.cardStyle, x, y, w2, 128 * k, 38);
    txt(ctx, s.label, x + 30, y + 44 * k, { size: 25 * k, weight: 600, color: soft(t) });
    txt(ctx, moneyC(s.v, r.hide), x + 30, y + 100 * k, { size: 50 * k, weight: 800, color: i === 0 ? t.accent : t.ink, max: w2 - 60 });
  });

  const py = y + 128 * k + 34;
  const left = Math.max(0, g.target - g.current);
  const bits: string[] = [];
  bits.push(frac >= 1 ? "Selamat, tujuan tercapai!" : r.hide ? "Sedikit lagi" : `Tinggal ${money(left, false)} lagi`);
  pill(ctx, t, cx, py, bits[0], { color: frac >= 1 ? t.good : t.accent, size: 31, h: 64 });
  if (g.targetDate) txt(ctx, `Target: ${longDate(g.targetDate)}`, cx, py + 64 + 40, { size: 27, weight: 600, color: soft(t, 0.7), align: "center" });
}

/* ── 5. Semua target ────────────────────────────────────── */

export function tGoals(r: R, a: Box) {
  const { ctx, t, d } = r;
  if (!d.goals.length) return emptyState(r, a, "Belum ada target tabungan", "Buat target di menu Tabungan & Target");
  const cx = a.x + a.w / 2;
  const rowH = 186;
  const summary = 128;
  const avail = a.h - 150 - summary - 30;
  const n = clamp(Math.floor(avail / (rowH + 22)), 2, 4);
  const list = [...d.goals].sort((x, y) => goalProgress(y) - goalProgress(x)).slice(0, n);
  const hh = 120 + list.length * (rowH + 22) + 8 + summary;
  const y0 = a.y + (a.h - hh) / 2;

  eyebrow(r, "Mimpi kita", cx, y0 + 30);
  txt(ctx, `${d.goals.length} target aktif`, cx, y0 + 92, { size: 46, weight: 800, color: t.ink, align: "center" });

  list.forEach((g, i) => {
    const y = y0 + 130 + i * (rowH + 22);
    const frac = goalProgress(g);
    card(ctx, t, r.s.cardStyle, a.x, y, a.w, rowH, 44);
    txt(ctx, g.name, a.x + 40, y + 62, { size: 42, weight: 800, color: t.ink, max: a.w - 300 });
    txt(ctx, `${Math.round(frac * 100)}%`, a.x + a.w - 40, y + 64, { size: 54, weight: 800, color: frac >= 1 ? t.good : t.accent, align: "right" });
    progressBar(ctx, t, a.x + 40, y + 88, a.w - 80, 26, frac);
    txt(ctx, r.hide ? (frac >= 1 ? "Tercapai" : "Sedang berjalan") : `${moneyC(g.current, false)} dari ${moneyC(g.target, false)}`, a.x + 40, y + 154, { size: 27, weight: 600, color: soft(t, 0.75) });
    if (g.targetDate) txt(ctx, shortDate(g.targetDate), a.x + a.w - 40, y + 154, { size: 27, weight: 600, color: soft(t, 0.6), align: "right" });
  });

  const sy = y0 + 130 + list.length * (rowH + 22) + 8;
  const tot = d.goals.reduce((s, g) => s + g.current, 0);
  const tgt = d.goals.reduce((s, g) => s + g.target, 0);
  card(ctx, t, r.s.cardStyle, a.x, sy, a.w, summary, 44);
  txt(ctx, "Total terkumpul", a.x + 40, sy + 50, { size: 26, weight: 600, color: soft(t) });
  txt(ctx, moneyC(tot, r.hide), a.x + 40, sy + 104, { size: 50, weight: 800, color: t.ink });
  txt(ctx, `${Math.round(tgt ? (tot / tgt) * 100 : 0)}%`, a.x + a.w - 40, sy + 92, { size: 64, weight: 800, color: t.accent, align: "right" });
}

/* ── 6. Milestone ───────────────────────────────────────── */

export function tMilestone(r: R, a: Box) {
  const { ctx, t } = r;
  const g = pickGoal(r, r.s.goalId ? "selected" : "closest");
  if (!g) return emptyState(r, a, "Belum ada target tabungan", "Buat target di menu Tabungan & Target");
  const cx = a.x + a.w / 2;
  const k = clamp(a.h / 900, 0.7, 1);
  const frac = goalProgress(g);
  const pct = Math.round(frac * 100);
  const hh = 100 + 340 * k + 100 + 130 + 40 + 64 + 60;
  const y0 = a.y + (a.h - hh) / 2;

  // confetti
  const rnd = mulberry32(hashString(g.id + g.name));
  const cols = [t.accent, t.accent2, t.good, rgba(t.ink, 0.8)];
  for (let i = 0; i < 60; i++) {
    const x = a.x + rnd() * a.w;
    const y = a.y + rnd() * a.h;
    if (x > a.x + 20 && x < a.x + a.w - 20 && y > y0 - 10 && y < y0 + hh - 40) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd() * Math.PI);
    ctx.fillStyle = cols[i % cols.length];
    ctx.globalAlpha = 0.35 + rnd() * 0.5;
    if (i % 3 === 0) sparkle4(ctx, 0, 0, 16 + rnd() * 14, ctx.fillStyle as string);
    else fillRR(ctx, -8, -16, 16, 32 + rnd() * 12, 6, ctx.fillStyle as string);
    ctx.restore();
  }

  eyebrow(r, frac >= 1 ? "Target tercapai!" : pct >= 75 ? "Hampir sampai!" : "Sudah sejauh ini", cx, y0 + 30);
  const numSize = 340 * k;
  const numY = y0 + 110 + 250 * k;
  const gradient = lin(ctx, 0, numY - numSize, 0, numY, [[0, t.accent], [1, t.accent2]]);
  const s = `${pct}`;
  const nw = measure(ctx, s, numSize, 800);
  const pw = measure(ctx, "%", numSize * 0.34, 800);
  const x0 = cx - (nw + pw + 8) / 2;
  ctx.save();
  ctx.shadowColor = rgba(t.accent, 0.5);
  ctx.shadowBlur = 50;
  txt(ctx, s, x0, numY, { size: numSize, weight: 800, color: gradient });
  ctx.restore();
  txt(ctx, "%", x0 + nw + 8, numY - numSize * 0.5, { size: numSize * 0.34, weight: 800, color: t.ink });

  const ny = numY + 90;
  txt(ctx, g.name, cx, ny, { size: 60, weight: 800, color: t.ink, align: "center", max: a.w - 40 });

  // 10 segmen
  const seg = 10;
  const gap = 12;
  const sw = (a.w - gap * (seg - 1)) / seg;
  const by = ny + 46;
  for (let i = 0; i < seg; i++) {
    const x = a.x + i * (sw + gap);
    const fill = clamp(frac * seg - i, 0, 1);
    fillRR(ctx, x, by, sw, 44, 14, rgba(t.ink, t.dark ? 0.14 : 0.12));
    if (fill > 0) {
      ctx.save();
      ctx.shadowColor = rgba(t.accent, 0.5);
      ctx.shadowBlur = 16;
      fillRR(ctx, x, by, Math.max(14, sw * fill), 44, 14, lin(ctx, x, 0, x + sw, 0, [[0, t.accent2], [1, t.accent]]));
      ctx.restore();
    }
  }
  const left = Math.max(0, g.target - g.current);
  pill(ctx, t, cx, by + 44 + 40, frac >= 1 ? "Selamat, kalian berhasil!" : r.hide ? "Tinggal sedikit lagi" : `Tinggal ${money(left, false)} lagi`, { color: frac >= 1 ? t.good : t.accent, size: 32, h: 66 });
}
