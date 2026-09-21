import type { MetadataRoute } from "next";

/**
 * Satu-satunya sumber manifest PWA (file public/manifest.webmanifest lama dihapus
 * karena bentrok dengan route ini).
 *
 * - `any`      : ikon full-bleed, tanpa margin hitam.
 * - `maskable` : latar diperluas, logo di zona aman 80% supaya tidak terpotong mask Android.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "KITA — Keuangan Berdua",
    short_name: "KITA",
    description: "Keuangan dan rencana hidup bersama dalam satu tempat.",
    lang: "id",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050514",
    theme_color: "#050514",
    categories: ["finance", "lifestyle", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
