"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Sinyal dari UI ke kanvas (ref mutable, jadi tidak memicu render ulang React). */
export type AuroraSignal = {
  /** Naik saat user mengetik / mengirim form; meluruh sendiri. 0–2. */
  energy: number;
  /** Set ke 1 untuk memicu ledakan kilau dari kartu. */
  burst: number;
  /** 0 = masuk, 1 = daftar (kedua bola cahaya saling mendekat). */
  mode: 0 | 1;
};

type Props = {
  signal: RefObject<AuroraSignal>;
  /** Kartu form (desktop): kedua bola cahaya mengorbit di sekelilingnya. */
  cardRef: RefObject<HTMLElement | null>;
  /** Blok hero (mobile): orbit di area atas layar. */
  heroRef: RefObject<HTMLElement | null>;
};

type Star = { u: number; v: number; r: number; ph: number; sp: number; d: number; ox: number; oy: number; hue: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; r: number; hue: number };
type Shoot = { x: number; y: number; vx: number; vy: number; life: number };

const BLUE: [number, number, number] = [82, 132, 255];
const PURPLE: [number, number, number] = [168, 92, 255];
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Latar hidup: aurora biru–ungu tua, bintang berkedip yang tertarik ke kursor/jari,
 * garis rasi antar bintang, bintang jatuh, dan dua bola cahaya (Eki = biru, Dinda = ungu)
 * yang mengorbit kartu login — saat mode Daftar, keduanya berjalan berdampingan.
 */
export function AuroraCanvas({ signal, cardRef, heroRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const family = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

    let w = 0;
    let h = 0;
    let dpr = 1;
    let mobile = false;
    let raf = 0;
    let last = performance.now();
    let t = reduced ? 3.2 : 0;
    let modeT = signal.current?.mode ?? 0;
    let energy = 0;
    let nextShoot = 2.5;

    const pointer = { x: 0, y: 0, sx: 0, sy: 0, active: false };
    let stars: Star[] = [];
    const sparks: Spark[] = [];
    const shoots: Shoot[] = [];
    const trailA: { x: number; y: number; t: number }[] = [];
    const trailB: { x: number; y: number; t: number }[] = [];

    const seed = () => {
      const count = Math.round(clamp((w * h) / (mobile ? 9000 : 11000), 36, 150));
      stars = Array.from({ length: count }, () => ({
        u: Math.random(),
        v: Math.random(),
        r: 0.5 + Math.random() * 1.7,
        ph: Math.random() * Math.PI * 2,
        sp: 0.6 + Math.random() * 1.8,
        d: 0.35 + Math.random() * 0.9,
        ox: 0,
        oy: 0,
        hue: Math.random() < 0.5 ? 0 : 1,
      }));
    };

    const resize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      mobile = nw < 720;
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      // Bilah alamat mobile mengubah innerHeight terus-menerus: abaikan perubahan kecil supaya tidak berkedip.
      if (Math.abs(nw - w) < 2 && Math.abs(nh - h) < 90 && canvas.width) return;
      w = nw;
      h = nh;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!stars.length || Math.abs(stars.length - Math.round(clamp((w * h) / (mobile ? 9000 : 11000), 36, 150))) > 12) seed();
      if (reduced) frame(0);
    };

    /* ── input ── */
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!pointer.active) {
        pointer.sx = e.clientX;
        pointer.sy = e.clientY;
      }
      pointer.active = true;
    };
    const onLeave = () => (pointer.active = false);

    const blobs = [
      { c: [36, 71, 255] as [number, number, number], bx: 0.12, by: 0.18, r: 0.62, sx: 0.11, sy: 0.08, ph: 0.0, a: 0.34 },
      { c: [124, 58, 237] as [number, number, number], bx: 0.88, by: 0.22, r: 0.66, sx: 0.09, sy: 0.12, ph: 1.7, a: 0.36 },
      { c: [29, 78, 216] as [number, number, number], bx: 0.28, by: 0.92, r: 0.7, sx: 0.13, sy: 0.07, ph: 3.1, a: 0.3 },
      { c: [147, 51, 234] as [number, number, number], bx: 0.92, by: 0.88, r: 0.56, sx: 0.08, sy: 0.1, ph: 4.4, a: 0.3 },
    ];

    const glowOrb = (x: number, y: number, r: number, c: [number, number, number], boost: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5.5 * boost);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.08, rgba(c, 0.95));
      g.addColorStop(0.3, rgba(c, 0.34));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 5.5 * boost, 0, Math.PI * 2);
      ctx.fill();
    };

    /** Jejak halus: kurva kuadratik lewat titik tengah, tebal & terang memudar ke ekor. */
    const trail = (pts: { x: number; y: number }[], c: [number, number, number]) => {
      const n = pts.length;
      if (n < 3) return;
      ctx.lineCap = "round";
      for (let i = 1; i < n - 1; i++) {
        const k = i / n;
        const x0 = (pts[i - 1].x + pts[i].x) / 2;
        const y0 = (pts[i - 1].y + pts[i].y) / 2;
        const x1 = (pts[i].x + pts[i + 1].x) / 2;
        const y1 = (pts[i].y + pts[i + 1].y) / 2;
        ctx.strokeStyle = rgba(c, k * 0.55);
        ctx.lineWidth = 0.6 + k * 3.4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, x1, y1);
        ctx.stroke();
      }
    };

    const sparkle = (x: number, y: number, r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y);
      ctx.quadraticCurveTo(x, y, x, y - r);
      ctx.fill();
    };

    function anchor() {
      const wide = w >= 1024;
      const el = (wide ? cardRef.current : heroRef.current) ?? cardRef.current;
      const rect = el?.getBoundingClientRect();
      if (!rect || !rect.width) return { cx: w * 0.72, cy: h * 0.5, rx: 260, ry: 300 };
      if (wide) return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, rx: rect.width * 0.66 + 40, ry: rect.height * 0.56 + 44 };
      return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height * 0.5, rx: Math.min(w * 0.48, rect.width * 0.55), ry: Math.max(70, rect.height * 0.42) };
    }

    function frame(dt: number) {
      const sig = signal.current;
      const target = sig?.mode ?? 0;
      modeT += (target - modeT) * Math.min(1, dt * 2.4 + (reduced ? 1 : 0));
      if (sig) {
        energy = Math.max(energy * Math.pow(0.12, dt), sig.energy);
        sig.energy *= Math.pow(0.1, dt);
      }
      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 6);
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 6);
      const parx = pointer.active ? (pointer.sx / w - 0.5) : 0;
      const pary = pointer.active ? (pointer.sy / h - 0.5) : 0;

      /* latar dasar */
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "#02040F");
      bg.addColorStop(0.5, "#070B34");
      bg.addColorStop(1, "#150846");
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      /* aurora */
      ctx.globalCompositeOperation = "lighter";
      const big = Math.max(w, h);
      blobs.forEach((b, i) => {
        const px = lerp(b.bx, 0.5, modeT * 0.22) + Math.sin(t * b.sx + b.ph) * 0.09 - parx * (0.05 + i * 0.012);
        const py = b.by + Math.cos(t * b.sy + b.ph) * 0.09 - pary * (0.05 + i * 0.012);
        const purpleBias = i % 2 === 1 ? 1 + modeT * 0.35 : 1 - modeT * 0.22;
        const a = b.a * purpleBias * (1 + energy * 0.25);
        const x = px * w;
        const y = py * h;
        const r = b.r * big;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(b.c, a));
        g.addColorStop(0.55, rgba(b.c, a * 0.28));
        g.addColorStop(1, rgba(b.c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      });

      /* bintang + garis rasi */
      const pos: { x: number; y: number; a: number }[] = [];
      const pull = mobile ? 150 : 200;
      for (const s of stars) {
        s.v -= dt * 0.004 * s.d;
        if (s.v < -0.02) {
          s.v = 1.02;
          s.u = Math.random();
        }
        let x = s.u * w + s.ox;
        let y = s.v * h + s.oy;
        if (pointer.active) {
          const dx = pointer.sx - x;
          const dy = pointer.sy - y;
          const d = Math.hypot(dx, dy);
          if (d < pull && d > 1) {
            const f = (1 - d / pull) * 0.9 * s.d;
            s.ox += (dx / d) * f * 60 * dt;
            s.oy += (dy / d) * f * 60 * dt;
          }
        }
        s.ox *= Math.pow(0.35, dt);
        s.oy *= Math.pow(0.35, dt);
        x = s.u * w + s.ox;
        y = s.v * h + s.oy;
        const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
        const a = clamp(tw * (0.55 + energy * 0.25), 0, 1);
        pos.push({ x, y, a });
        ctx.fillStyle = s.hue ? rgba(PURPLE, a * 0.9) : rgba([170, 200, 255], a * 0.9);
        ctx.beginPath();
        ctx.arc(x, y, s.r * (0.8 + tw * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      const link = mobile ? 86 : 118;
      ctx.lineWidth = 1;
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dx = pos[i].x - pos[j].x;
          const dy = pos[i].y - pos[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < link * link) {
            const k = 1 - Math.sqrt(d2) / link;
            ctx.strokeStyle = `rgba(140,160,255,${k * 0.2 * Math.min(pos[i].a, pos[j].a) * 1.6})`;
            ctx.beginPath();
            ctx.moveTo(pos[i].x, pos[i].y);
            ctx.lineTo(pos[j].x, pos[j].y);
            ctx.stroke();
          }
        }
      }

      /* bintang jatuh */
      nextShoot -= dt;
      if (nextShoot <= 0 && !reduced) {
        nextShoot = 4 + Math.random() * 5;
        shoots.push({ x: Math.random() * w * 0.8, y: Math.random() * h * 0.35, vx: 520 + Math.random() * 220, vy: 220 + Math.random() * 120, life: 1 });
      }
      for (let i = shoots.length - 1; i >= 0; i--) {
        const s = shoots[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt * 1.1;
        if (s.life <= 0) {
          shoots.splice(i, 1);
          continue;
        }
        const len = 110;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - (s.vx / 700) * len, s.y - (s.vy / 700) * len);
        g.addColorStop(0, `rgba(230,236,255,${s.life})`);
        g.addColorStop(1, "rgba(120,140,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - (s.vx / 700) * len, s.y - (s.vy / 700) * len);
        ctx.stroke();
      }

      /* dua bola cahaya: Eki (biru) & Dinda (ungu) */
      const an = anchor();
      const speed = 0.5 + energy * 0.7;
      const ang = t * speed;
      const dphi = lerp(Math.PI, 0.5, modeT);
      const rScale = lerp(1, 0.86, modeT);
      const put = (phase: number) => {
        let x = an.cx + Math.cos(ang + phase) * an.rx * rScale + parx * 26;
        let y = an.cy + Math.sin(ang + phase) * an.ry * rScale + pary * 18;
        if (pointer.active) {
          const dx = pointer.sx - x;
          const dy = pointer.sy - y;
          const d = Math.hypot(dx, dy);
          if (d < 240) {
            const f = (1 - d / 240) * 0.35;
            x += dx * f;
            y += dy * f;
          }
        }
        return { x, y };
      };
      const a = put(0);
      const b = put(dphi);
      const life = mobile ? 0.32 : 0.48; // detik — berbasis waktu supaya sama di layar 30/60/120 Hz
      trailA.push({ ...a, t });
      trailB.push({ ...b, t });
      while (trailA.length && t - trailA[0].t > life) trailA.shift();
      while (trailB.length && t - trailB[0].t > life) trailB.shift();
      trail(trailA, BLUE);
      trail(trailB, PURPLE);

      // benang cahaya di antara keduanya — makin terang saat berdekatan
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const near = clamp(1 - dist / (an.rx * 2), 0, 1);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const nx = -(b.y - a.y);
      const ny = b.x - a.x;
      const nl = Math.hypot(nx, ny) || 1;
      const bulge = Math.sin(t * 1.3) * 34 * (1 - modeT * 0.6);
      const thread = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      const ta = 0.04 + near * 0.6 + energy * 0.08;
      thread.addColorStop(0, rgba(BLUE, ta));
      thread.addColorStop(1, rgba(PURPLE, ta));
      ctx.strokeStyle = thread;
      ctx.lineWidth = 1 + near * 2.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx + (nx / nl) * bulge, my + (ny / nl) * bulge, b.x, b.y);
      ctx.stroke();

      const boost = 1 + energy * 0.7 + modeT * 0.15;
      const pulse = 1 + Math.sin(t * 3) * 0.06;
      glowOrb(a.x, a.y, (mobile ? 5 : 6.5) * pulse, BLUE, boost);
      glowOrb(b.x, b.y, (mobile ? 5 : 6.5) * pulse, PURPLE, boost);

      if (w >= 1024) {
        ctx.globalCompositeOperation = "source-over";
        ctx.font = `700 12px ${family}`;
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(210,222,255,0.85)";
        ctx.fillText("Eki", a.x + 20, a.y - 16);
        ctx.fillStyle = "rgba(226,208,255,0.85)";
        ctx.fillText("Dinda", b.x + 20, b.y - 16);
        ctx.globalCompositeOperation = "lighter";
      }

      /* ledakan kilau dari kartu */
      if (sig && sig.burst > 0) {
        const n = 54;
        for (let i = 0; i < n; i++) {
          const ang2 = Math.random() * Math.PI * 2;
          const sp = 80 + Math.random() * 380;
          sparks.push({ x: an.cx, y: an.cy, vx: Math.cos(ang2) * sp, vy: Math.sin(ang2) * sp, life: 1, r: 2 + Math.random() * 5, hue: Math.random() < 0.5 ? 0 : 1 });
        }
        sig.burst = 0;
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= Math.pow(0.2, dt);
        s.vy *= Math.pow(0.2, dt);
        s.life -= dt * 0.8;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        sparkle(s.x, s.y, s.r * (0.5 + s.life), s.hue ? rgba(PURPLE, s.life) : rgba([160, 200, 255], s.life));
      }

      ctx.globalCompositeOperation = "source-over";
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      frame(dt);
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) {
      frame(0);
    } else {
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="kx-canvas" aria-hidden />;
}
