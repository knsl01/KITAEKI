/** Selisih hari kalender antara dua tanggal ISO (YYYY-MM-DD). Positif kalau `to` setelah `from`. */
export function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = toIso.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** 0 → "Hari ini", 1 → "Besok", 5 → "5 hari lagi", -2 → "Lewat 2 hari". */
export function relativeDays(diff: number): string {
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff === -1) return "Kemarin";
  if (diff > 0) {
    if (diff >= 60) return `${Math.round(diff / 30)} bulan lagi`;
    return `${diff} hari lagi`;
  }
  return `Lewat ${Math.abs(diff)} hari`;
}
