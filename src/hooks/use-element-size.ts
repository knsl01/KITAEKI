"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** useLayoutEffect di browser, useEffect di server (menghindari peringatan SSR). */
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type ElementSize = { width: number; height: number };

/**
 * Ukuran elemen dalam piksel, diperbarui lewat ResizeObserver.
 * `initial` dipakai sebelum ada pengukuran (render server dan frame pertama).
 */
export function useElementSize<T extends HTMLElement>(initial: ElementSize = { width: 0, height: 0 }) {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>(initial);

  const update = useCallback((width: number, height: number) => {
    const w = Math.round(width);
    const h = Math.round(height);
    setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
  }, []);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) update(rect.width, rect.height);

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) update(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  return [ref, size] as const;
}
