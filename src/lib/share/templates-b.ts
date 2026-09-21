/** Template kartu (bagian 2): pencapaian, kategori, pasangan, rekap, streak, struk, quote. */
import { computeAchievements } from "./achievements";
import {
  avatar, card, donut, fillRR, glow, hashString, icon, idr, lin, longDate, MONO, measure, money, moneyC, mulberry32, pill, rgba, rrPath,
  shortDate, soft, sparkle4, txt, wrap, type Box,
} from "./canvas";
import { pickQuote } from "./quotes";
import { bigMoney, clamp, emptyState, eyebrow, type R } from "./templates-a";

/* ── 7. Pencapaian ──────────────────────────────────────── */

export function tAchievements(r: R, a: Box) {
  const { ctx, t } = r;
  const cx = a.x + a.w / 2;
  const all = computeAchievements(r.d);
  const unlocked = all.filter((x) => x.unlocked);
  const locked = all.filter((x) => !x.unlocked);
  const list = [...unlocked, ...locked].slice(0, 6);
  const headH = 130;
  const gap = 22;
  const tileH = clamp((a.h - headH - gap * 2 - 16) / 3, 180, 262);
  const hh = headH + tileH * 3 + gap * 2;
  const y0 = a.y + (a.h - hh) / 2;

  eyebrow(r, "Pencapaian kita", cx, y0 + 30);
  txt(ctx, `${unlocked.length} dari ${all.length} terbuka`, cx, y0 + 92, { size: 46, weight: 800, color: t.ink, align: "center" });

  const w = (a.w - gap) / 2;
  list.forEach((ach, i) => {
    const x = a.x + (i % 2) * (w + gap);
    const y = y0 + headH + Math.floor(i / 2) * (tileH + gap);
    ctx.save();
    ctx.globalAlpha = ach.unlocked ? 1 : 0.5;
    card(ctx, t, r.s.cardStyle, x, y, w, tileH, 44);
    const cr = tileH * 0.19;
    const icx = x + 40 + cr;
    const icy = y + tileH * 0.33;
    ctx.beginPath();
    ctx.arc(icx, icy, cr, 0, Math.PI * 2);
    ctx.fillStyle = ach.unlocked ? lin(ctx, icx - cr, icy - cr, icx + cr, icy + cr, [[0, t.accent2], [1, t.accent]]) : rgba(t.ink, 0.14);
    ctx.fill();
    if (ach.unlocked) {
      ctx.save();
      ctx.shadowColor = rgba(t.accent, 0.5);
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.arc(icx, icy, cr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fill();
      ctx.restore();
    }
    icon(ctx, ach.unlocked ? ach.icon : "lock", icx, icy, cr * 1.05, ach.unlocked ? (t.dark ? "#0B0B1E" : "#fff") : soft(t, 0.7), { cutColor: ach.unlocked ? rgba(t.dark ? "#0B0B1E" : "#ffffff", 0) : undefined });
    if (ach.unlocked) {
      // tanda centang kecil
      ctx.beginPath();
      ctx.arc(x + w - 44, y + 44, 20, 0, Math.PI * 2);
      ctx.fillStyle = t.good;
      ctx.fill();
      icon(ctx, "check", x + w - 44, y + 44, 22, t.dark ? "#06231A" : "#fff", { lineWidth: 3.4 });
    }
    txt(ctx, ach.title, x + 40, y + tileH * 0.68, { size: 34, weight: 800, color: t.ink, max: w - 80 });
    txt(ctx, ach.desc, x + 40, y + tileH * 0.68 + 42, { size: 25, weight: 500, color: soft(t, 0.7), max: w - 80 });
    ctx.restore();
  });
}

/* ── 8. Kategori ────────────────────────────────────────── */

export function tCategories(r: R, a: Box) {
  const { ctx, t, d } = r;
  if (!d.categories.length) return emptyState(r, a, "Belum ada pengeluaran bulan ini", "Catat transaksi supaya grafik ini terisi", "piggy");
  const cx = a.x + a.w / 2;
  const palette = [t.accent, t.accent2, "#FFC857", t.good, "#8E9BFF", rgba(t.ink, 0.5)];
  const top = d.categories.slice(0, 5);
  const rest = d.categories.slice(5).reduce((s, c) => s + c.value, 0);
  const parts = top.map((c, i) => ({ ...c, color: palette[i] }));
  if (rest > 0) parts.push({ name: "Lainnya", value: rest, color: palette[5] });
  const total = parts.reduce((s, p) => s + p.value, 0);

  // skala supaya donat + daftar selalu muat di area (Story maupun Feed)
  const k = Math.min(1, (a.h - 146) / (400 + 76 * parts.length));
  const rr = 200 * k;
  const rowH = 76 * k;
  const hh = 56 + rr * 2 + 70 + parts.length * rowH + 20;
  const y0 = a.y + (a.h - hh) / 2;

  eyebrow(r, `Ke mana uangnya · ${d.monthName}`, cx, y0 + 30);
  const cy = y0 + 56 + rr + 30;
  donut(ctx, cx, cy, rr, 64 * k, parts);
  txt(ctx, moneyC(total, r.hide), cx, cy - 8 * k, { size: 66 * k, weight: 800, color: t.ink, align: "center", base: "middle", max: rr * 1.5 });
  txt(ctx, "pengeluaran", cx, cy + 50 * k, { size: 27 * k, weight: 600, color: soft(t), align: "center" });

  const ly = cy + rr + 60 * k;
  card(ctx, t, r.s.cardStyle, a.x, ly - 20, a.w, parts.length * rowH + 40, 44);
  parts.forEach((p, i) => {
    const y = ly + i * rowH + rowH / 2;
    ctx.beginPath();
    ctx.arc(a.x + 56, y, 15, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    txt(ctx, p.name, a.x + 92, y, { size: 36 * k, weight: 700, color: t.ink, base: "middle", max: 420 });
    txt(ctx, r.hide ? "" : moneyC(p.value, false), a.x + a.w - 190, y, { size: 28 * k, weight: 600, color: soft(t, 0.7), align: "right", base: "middle" });
    txt(ctx, `${Math.round((p.value / total) * 100)}%`, a.x + a.w - 44, y, { size: 38 * k, weight: 800, color: t.ink, align: "right", base: "middle" });
  });
}

/* ── 9. Pasangan ────────────────────────────────────────── */

export function tCouple(r: R, a: Box) {
  const { ctx, t, d } = r;
  const cx = a.x + a.w / 2;
  const k = clamp(a.h / 900, 0.72, 1);
  const two = d.members.length > 1;
  const ar = (two ? 168 : 200) * k;
  const hh = 30 + ar * 2 + 96 * k + 58 * k + 60 + 170 * k;
  const y0 = a.y + (a.h - hh) / 2;
  const ay = y0 + 30 + ar;

  glow(ctx, cx, ay, ar * 2.6, t.accent, 0.35);
  if (two) {
    avatar(ctx, t, r.a.avatars[d.members[0].key] ?? null, d.members[0].name, cx - ar * 0.68, ay, ar);
    avatar(ctx, t, r.a.avatars[d.members[1].key] ?? null, d.members[1].name, cx + ar * 0.68, ay, ar);
    // lencana hati
    const hy = ay + ar * 0.98;
    ctx.beginPath();
    ctx.arc(cx, hy, 46 * k, 0, Math.PI * 2);
    ctx.fillStyle = lin(ctx, cx - 46, hy - 46, cx + 46, hy + 46, [[0, t.accent2], [1, t.accent]]);
    ctx.shadowColor = rgba(t.accent, 0.6);
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowColor = "transparent";
    icon(ctx, "heart", cx, hy + 2, 46 * k, "#fff");
  } else {
    avatar(ctx, t, r.a.avatars[d.members[0]?.key ?? ""] ?? null, d.members[0]?.name ?? "K", cx, ay, ar);
  }

  const ny = ay + ar + 96 * k;
  txt(ctx, d.coupleName, cx, ny, { size: 96 * k, weight: 800, color: t.ink, align: "center", max: a.w });
  txt(ctx, r.s.caption.trim() || "Berdua menuju masa depan", cx, ny + 58 * k, { size: 36 * k, weight: 500, color: soft(t, 0.75), align: "center", max: a.w - 40 });

  const sy = ny + 58 * k + 60;
  const w = (a.w - 48) / 3;
  const sh = 170 * k;
  [
    { label: "Saldo", v: moneyC(d.totalBalance, r.hide) },
    { label: "Target aktif", v: String(d.goals.length) },
    { label: "Streak", v: `${d.streak} hari` },
  ].forEach((s, i) => {
    const x = a.x + i * (w + 24);
    card(ctx, t, r.s.cardStyle, x, sy, w, sh, 40);
    txt(ctx, s.v, x + w / 2, sy + sh * 0.5, { size: 46 * k, weight: 800, color: t.ink, align: "center", max: w - 30 });
    txt(ctx, s.label, x + w / 2, sy + sh * 0.5 + 42 * k, { size: 25 * k, weight: 600, color: soft(t, 0.7), align: "center" });
  });
}

/* ── 10. Rekap bulan ────────────────────────────────────── */

export function tMonthly(r: R, a: Box) {
  const { ctx, t, d } = r;
  const cx = a.x + a.w / 2;
  const showCat = a.h >= 900 && d.categories.length > 0;
  const gridH = 168;
  const hh = 60 + 210 + 40 + gridH * 2 + 24 + (showCat ? 30 + 150 : 0) + 30 + 64;
  const y0 = a.y + (a.h - hh) / 2;

  eyebrow(r, "Rekap bulan ini", cx, y0 + 30);
  const g = lin(ctx, a.x, 0, a.x + a.w, 0, [[0, t.accent], [1, t.accent2]]);
  txt(ctx, d.monthName, cx, y0 + 60 + 150, { size: 168, weight: 800, color: g, align: "center", max: a.w });
  txt(ctx, d.year, cx, y0 + 60 + 210, { size: 46, weight: 700, color: soft(t, 0.75), align: "center", track: 10 });

  const w = (a.w - 24) / 2;
  const gy = y0 + 60 + 210 + 40;
  const cells = [
    { label: "Pemasukan", v: moneyC(d.income, r.hide), c: t.good },
    { label: "Pengeluaran", v: moneyC(d.expense, r.hide), c: t.bad },
    { label: d.net >= 0 ? "Sisa" : "Kurang", v: moneyC(Math.abs(d.net), r.hide), c: d.net >= 0 ? t.accent : t.bad },
    { label: "Transaksi", v: String(d.txCountMonth), c: t.ink },
  ];
  cells.forEach((c, i) => {
    const x = a.x + (i % 2) * (w + 24);
    const y = gy + Math.floor(i / 2) * (gridH + 24);
    card(ctx, t, r.s.cardStyle, x, y, w, gridH, 42);
    txt(ctx, c.label, x + 34, y + 54, { size: 27, weight: 600, color: soft(t) });
    txt(ctx, c.v, x + 34, y + 122, { size: 58, weight: 800, color: c.c, max: w - 68 });
  });

  let y = gy + gridH * 2 + 24;
  if (showCat) {
    const top = d.categories[0];
    y += 30;
    card(ctx, t, r.s.cardStyle, a.x, y, a.w, 150, 44);
    txt(ctx, "Paling banyak dipakai untuk", a.x + 40, y + 52, { size: 26, weight: 600, color: soft(t) });
    txt(ctx, top.name, a.x + 40, y + 112, { size: 48, weight: 800, color: t.ink, max: a.w - 420 });
    txt(ctx, moneyC(top.value, r.hide), a.x + a.w - 40, y + 108, { size: 44, weight: 800, color: t.accent, align: "right" });
    y += 150;
  }
  if (d.savingsRate != null) {
    pill(ctx, t, cx, y + 30, r.hide ? "Ringkasan bulan ini" : `${Math.round(d.savingsRate)}% penghasilan tersisa`, { color: d.savingsRate >= 0 ? t.good : t.bad, size: 30, h: 64 });
  }
}

/* ── 11. Streak ─────────────────────────────────────────── */

export function tStreak(r: R, a: Box) {
  const { ctx, t, d } = r;
  const cx = a.x + a.w / 2;
  const k = clamp(a.h / 980, 0.66, 1);
  const cell = 96 * k;
  const gap = 12 * k;
  const gridH = cell * 4 + gap * 3;
  const numSize = 300 * k;
  const hh = 60 + numSize * 0.9 + 64 * k + 70 * k + gridH + 60 * k;
  const y0 = a.y + (a.h - hh) / 2;

  eyebrow(r, "Konsisten mencatat", cx, y0 + 30);

  const fr = 128 * k;
  const numY = y0 + 60 + numSize * 0.9;
  const numW = measure(ctx, String(d.streak), numSize, 800);
  const total = fr * 2 + 26 + numW;
  const fx = cx - total / 2 + fr;
  glow(ctx, fx, numY - numSize * 0.36, fr * 2.4, "#FF8A3D", 0.4);
  ctx.beginPath();
  ctx.arc(fx, numY - numSize * 0.36, fr, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, fx - fr, numY - numSize * 0.36 - fr, fx + fr, numY - numSize * 0.36 + fr, [[0, "#FFB347"], [1, "#FF4D6D"]]);
  ctx.fill();
  icon(ctx, "flame", fx, numY - numSize * 0.36, fr * 1.15, "#fff", { cutColor: "rgba(255,120,60,0.55)" });
  const grad = lin(ctx, 0, numY - numSize, 0, numY, [[0, "#FFD27A"], [1, "#FF7A59"]]);
  txt(ctx, String(d.streak), fx + fr + 26, numY, { size: numSize, weight: 800, color: t.dark ? grad : "#E4572E" });

  txt(ctx, d.streak === 1 ? "hari mencatat" : "hari beruntun mencatat", cx, numY + 64 * k, { size: 46 * k, weight: 700, color: t.ink, align: "center" });

  // peta 28 hari (kolom = Sen…Min)
  const active = new Set(d.activeDays);
  const [y, m, dd] = d.today.split("-").map(Number);
  const todayUtc = Date.UTC(y, m - 1, dd);
  const dow = (new Date(todayUtc).getUTCDay() + 6) % 7; // 0 = Senin
  const gw = cell * 7 + gap * 6;
  const gx = cx - gw / 2;
  const gy = numY + 64 * k + 70 * k;
  const names = ["S", "S", "R", "K", "J", "S", "M"];
  names.forEach((n, i) => txt(ctx, n, gx + i * (cell + gap) + cell / 2, gy - 12 * k, { size: 22 * k, weight: 700, color: soft(t, 0.5), align: "center" }));
  for (let idx = 0; idx < 28; idx++) {
    const row = Math.floor(idx / 7);
    const col = idx % 7;
    // baris terakhir berakhir pada hari ini
    const daysAgo = 3 * 7 + dow - (row * 7 + col);
    const iso = new Date(todayUtc - daysAgo * 86400000).toISOString().slice(0, 10);
    const future = daysAgo < 0;
    const x = gx + col * (cell + gap);
    const yy = gy + row * (cell + gap);
    const on = active.has(iso);
    if (future) {
      rrPath(ctx, x, yy, cell, cell, 26 * k);
      ctx.strokeStyle = rgba(t.ink, 0.1);
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.save();
      if (on) {
        ctx.shadowColor = rgba("#FF7A59", 0.55);
        ctx.shadowBlur = 18;
      }
      fillRR(ctx, x, yy, cell, cell, 26 * k, on ? lin(ctx, x, yy, x + cell, yy + cell, [[0, "#FFB347"], [1, "#FF4D6D"]]) : rgba(t.ink, t.dark ? 0.1 : 0.09));
      ctx.restore();
      if (on) icon(ctx, "check", x + cell / 2, yy + cell / 2, cell * 0.36, "#fff", { lineWidth: 3.2 });
    }
    if (daysAgo === 0) {
      rrPath(ctx, x - 5, yy - 5, cell + 10, cell + 10, 30 * k);
      ctx.strokeStyle = t.ink;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
  txt(ctx, "28 hari terakhir", cx, gy + gridH + 52 * k, { size: 26 * k, weight: 600, color: soft(t, 0.65), align: "center" });
}

/* ── 12. Struk ──────────────────────────────────────────── */

export function tReceipt(r: R, a: Box) {
  const { ctx, t, d } = r;
  const cx = a.x + a.w / 2;
  const paperW = 800;
  const fs = 32;
  const rowH = 56;
  const rowsN = clamp(Math.floor((a.h - 560) / rowH), 4, 7);
  const goalsSum = d.goals.reduce((s, g) => s + g.current, 0);
  const rows: [string, string][] = [
    ["SALDO GABUNGAN", money(d.totalBalance, r.hide)],
    ["PEMASUKAN", money(d.income, r.hide)],
    ["PENGELUARAN", money(d.expense, r.hide)],
    ["SISA BULAN INI", money(d.net, r.hide)],
    ["TABUNGAN TARGET", money(goalsSum, r.hide)],
    ["TARGET AKTIF", String(d.goals.length)],
    ["STREAK", `${d.streak} HARI`],
  ].slice(0, rowsN) as [string, string][];

  const head = 250;
  const foot = 300;
  const ph = head + rows.length * rowH + foot;
  const py = a.y + (a.h - ph) / 2;
  const px = cx - paperW / 2;
  const ink = "#2A2622";

  ctx.save();
  ctx.translate(cx, py + ph / 2);
  ctx.rotate(-0.022);
  ctx.translate(-cx, -(py + ph / 2));

  // kertas bergerigi
  const tooth = 22;
  ctx.beginPath();
  ctx.moveTo(px, py);
  for (let x = px; x < px + paperW; x += tooth) {
    ctx.lineTo(x + tooth / 2, py - 14);
    ctx.lineTo(x + tooth, py);
  }
  ctx.lineTo(px + paperW, py + ph);
  for (let x = px + paperW; x > px; x -= tooth) {
    ctx.lineTo(x - tooth / 2, py + ph + 14);
    ctx.lineTo(x - tooth, py + ph);
  }
  ctx.closePath();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#FBF8F1";
  ctx.fill();
  ctx.shadowColor = "transparent";

  const dash = (y: number) => {
    ctx.beginPath();
    ctx.moveTo(px + 48, y);
    ctx.lineTo(px + paperW - 48, y);
    ctx.strokeStyle = "rgba(42,38,34,0.55)";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  txt(ctx, "KITA", cx, py + 92, { size: 78, weight: 800, color: ink, align: "center", family: MONO, track: 14 });
  txt(ctx, "STRUK KEUANGAN BERDUA", cx, py + 138, { size: 26, weight: 700, color: ink, align: "center", family: MONO, track: 3 });
  txt(ctx, `${longDate(d.today).toUpperCase()}`, cx, py + 180, { size: 24, weight: 500, color: "rgba(42,38,34,0.7)", align: "center", family: MONO });
  txt(ctx, d.coupleName.toUpperCase(), cx, py + 214, { size: 24, weight: 500, color: "rgba(42,38,34,0.7)", align: "center", family: MONO, max: paperW - 100 });
  dash(py + head - 12);

  rows.forEach(([l, v], i) => {
    const y = py + head + 32 + i * rowH;
    txt(ctx, l, px + 48, y, { size: fs - 4, weight: 500, color: ink, family: MONO });
    txt(ctx, v, px + paperW - 48, y, { size: fs, weight: 800, color: ink, align: "right", family: MONO, max: 330 });
  });

  const fy = py + head + rows.length * rowH + 10;
  dash(fy);
  txt(ctx, "TOTAL SALDO", px + 48, fy + 72, { size: 34, weight: 800, color: ink, family: MONO });
  txt(ctx, money(d.totalBalance, r.hide), px + paperW - 48, fy + 72, { size: 44, weight: 800, color: ink, align: "right", family: MONO, max: 400 });
  dash(fy + 108);
  txt(ctx, "TERIMA KASIH SUDAH MENABUNG!", cx, fy + 158, { size: 26, weight: 700, color: ink, align: "center", family: MONO, max: paperW - 96 });

  // barcode dekoratif dari angka saldo
  const rnd = mulberry32(hashString(String(d.totalBalance) + d.coupleName));
  let bx = px + 120;
  const by = fy + 186;
  while (bx < px + paperW - 120) {
    const w = 3 + Math.floor(rnd() * 3) * 3;
    ctx.fillStyle = ink;
    ctx.fillRect(bx, by, w, 62);
    bx += w + 3 + Math.floor(rnd() * 3) * 3;
  }
  ctx.restore();
}

/* ── 13. Quote ──────────────────────────────────────────── */

export function tQuote(r: R, a: Box) {
  const { ctx, t, d } = r;
  const cx = a.x + a.w / 2;
  const text = r.s.quote.trim() || pickQuote(hashString(d.today));

  // ukuran terbesar yang masih muat
  let size = 82;
  let lines = wrap(ctx, text, a.w - 40, size, 700, true);
  const maxH = a.h - 360;
  while (size > 40 && (lines.length * size * 1.3 > maxH || lines.length > 9)) {
    size -= 4;
    lines = wrap(ctx, text, a.w - 40, size, 700, true);
  }
  const lh = size * 1.3;
  const blockH = lines.length * lh;
  const hh = 150 + blockH + 130;
  const y0 = a.y + (a.h - hh) / 2;

  // tanda kutip besar
  ctx.save();
  ctx.font = "800 460px Georgia, 'Times New Roman', serif";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  ctx.fillStyle = rgba(t.accent, 0.28);
  ctx.fillText("\u201C", cx, y0 + 330);
  ctx.restore();

  const rnd = mulberry32(hashString(text));
  for (let i = 0; i < 9; i++) {
    const x = a.x + rnd() * a.w;
    const y = a.y + rnd() * a.h;
    if (y > y0 + 140 && y < y0 + 150 + blockH) continue;
    sparkle4(ctx, x, y, 12 + rnd() * 18, rgba(i % 2 ? t.accent : t.accent2, 0.35 + rnd() * 0.4));
  }

  const ty = y0 + 150 + size * 0.9;
  lines.forEach((ln, i) => txt(ctx, ln, cx, ty + i * lh, { size, weight: 700, italic: true, color: t.ink, align: "center" }));

  const ay = ty + (lines.length - 1) * lh + 90;
  ctx.beginPath();
  ctx.moveTo(cx - 60, ay - 46);
  ctx.lineTo(cx + 60, ay - 46);
  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.stroke();
  txt(ctx, d.coupleName, cx, ay + 10, { size: 42, weight: 800, color: t.accent, align: "center", max: a.w });
}
