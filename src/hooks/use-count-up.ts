"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Angka yang bergulir ke nilai barunya. Render pertama langsung memakai nilai akhir
 * (tidak ada kedip dari 0), jadi animasi hanya jalan saat nilainya berubah,
 * misalnya waktu pindah tampilan Bersama → Eki.
 */
export function useCountUp(value: number, duration = 650) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;

    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      const current = from + (value - from) * eased;
      fromRef.current = current;
      setDisplay(t === 1 ? value : current);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return Math.round(display);
}
