/** Alat kecil untuk grafik SVG buatan sendiri. Tanpa dependensi. */

export type Pt = { x: number; y: number };

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Kurva halus yang tidak pernah melampaui titik datanya (monotone cubic, Fritsch–Carlson). */
export function monotonePath(pts: Pt[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${round2(pts[0].x)},${round2(pts[0].y)}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    slope.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x || 1));
  }

  const tangent: number[] = new Array(n).fill(0);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      tangent[i] = tau * a * slope[i];
      tangent[i + 1] = tau * b * slope[i];
    }
  }

  let d = `M${round2(pts[0].x)},${round2(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const step = dx[i] / 3;
    d += ` C${round2(pts[i].x + step)},${round2(pts[i].y + tangent[i] * step)} ${round2(
      pts[i + 1].x - step
    )},${round2(pts[i + 1].y - tangent[i + 1] * step)} ${round2(pts[i + 1].x)},${round2(pts[i + 1].y)}`;
  }
  return d;
}

/** Skala sumbu Y yang "enak dibaca": 0, 250 rb, 500 rb, … */
export function niceScale(max: number, count = 4): { max: number; step: number; ticks: number[] } {
  if (!(max > 0) || !Number.isFinite(max)) return { max: 1, step: 1, ticks: [0, 1] };

  const raw = max / count;
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  const step = nf * 10 ** exp;
  const top = Math.ceil(max / step - 1e-9) * step;

  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { max: ticks[ticks.length - 1], step, ticks };
}

const compactFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** 1.500.000 → "1,5 jt", 250.000 → "250 rb", 2.400.000.000 → "2,4 M". */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1e12) return `${sign}${compactFormat.format(abs / 1e12)} T`;
  if (abs >= 1e9) return `${sign}${compactFormat.format(abs / 1e9)} M`;
  if (abs >= 1e6) return `${sign}${compactFormat.format(abs / 1e6)} jt`;
  if (abs >= 1e3) return `${sign}${compactFormat.format(abs / 1e3)} rb`;
  return `${sign}${compactFormat.format(abs)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Persegi panjang dengan sudut atas membulat (untuk batang grafik). */
export function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.max(0, Math.min(r, w / 2, h));
  if (h <= 0 || w <= 0) return "";
  return [
    `M${round2(x)},${round2(y + h)}`,
    `V${round2(y + radius)}`,
    `Q${round2(x)},${round2(y)} ${round2(x + radius)},${round2(y)}`,
    `H${round2(x + w - radius)}`,
    `Q${round2(x + w)},${round2(y)} ${round2(x + w)},${round2(y + radius)}`,
    `V${round2(y + h)}`,
    "Z",
  ].join(" ");
}

/**
 * Ukuran huruf yang membuat teks `chars` karakter muat di `available` piksel.
 * Angka uang tidak boleh terpotong, jadi ukurannya menyusut sampai `min`.
 */
export function fitFontSize(chars: number, available: number, max: number, min: number, charWidthEm = 0.62): number {
  if (chars <= 0 || available <= 0) return max;
  return clamp(Math.floor(available / (chars * charWidthEm)), min, max);
}
