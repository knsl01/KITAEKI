"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lanskap berlapis yang bergeser halus mengikuti kursor.
 * Dibuat dari SVG datar, bukan foto, jadi ringan dan ikut warna tema.
 */
export function LoginScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;

    function onMove(event: PointerEvent) {
      const rect = node!.getBoundingClientRect();
      setOffset({
        x: (event.clientX - rect.left) / rect.width - 0.5,
        y: (event.clientY - rect.top) / rect.height - 0.5,
      });
    }

    node.addEventListener("pointermove", onMove);
    return () => node.removeEventListener("pointermove", onMove);
  }, [reduced]);

  const layer = (depth: number) => ({
    transform: `translate3d(${offset.x * depth * 26}px, ${offset.y * depth * 12}px, 0)`,
    transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
  });

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" aria-hidden>
      <svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
        <rect width="800" height="900" fill="hsl(var(--sidebar))" />

        <g style={layer(0.2)}>
          <circle cx="600" cy="190" r="58" fill="#E8DFCF" opacity="0.14" />
        </g>

        <g style={layer(0.4)} opacity="0.2">
          <path d="M-60 640 L150 430 L320 610 L470 470 L640 640 L860 470 L860 940 L-60 940 Z" fill="#DCE5D8" />
        </g>

        <g style={layer(0.7)} opacity="0.34">
          <path d="M-60 740 L120 560 L300 720 L450 600 L620 760 L860 590 L860 940 L-60 940 Z" fill="#B7C7B2" />
        </g>

        <g style={layer(1.1)} opacity="0.55">
          <path d="M-60 830 L140 670 L330 820 L520 700 L720 840 L860 750 L860 940 L-60 940 Z" fill="#6E8470" />
        </g>

        <g style={layer(1.6)}>
          <path d="M-60 920 L180 790 L400 900 L620 800 L860 880 L860 960 L-60 960 Z" fill="#26352C" />
        </g>
      </svg>
    </div>
  );
}
