/** Util Web Push sisi browser (dipakai hook usePush). */

/** Tanda kutip di env (kesalahan umum saat copy-paste ke dashboard hosting) dibuang. */
export const VAPID_PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim().replace(/^["']|["']$/g, "");

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushEnv = {
  isIOS: boolean;
  /** Dibuka dari ikon di layar utama (PWA terpasang). Di iOS, push HANYA jalan dalam mode ini. */
  standalone: boolean;
  hasServiceWorker: boolean;
  hasPush: boolean;
};

export function detectPushEnv(): PushEnv {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ mengaku sebagai Mac
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return {
    isIOS,
    standalone,
    hasServiceWorker: "serviceWorker" in navigator,
    hasPush: "PushManager" in window && "Notification" in window,
  };
}

export async function registerServiceWorker() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  // `ready` menunggu service worker benar-benar aktif; subscribe sebelum aktif akan gagal di beberapa browser.
  return navigator.serviceWorker.ready;
}

export function sameApplicationServerKey(sub: PushSubscription, key: Uint8Array) {
  const current = sub.options?.applicationServerKey;
  if (!current) return true; // tidak bisa dibandingkan — anggap sama
  const a = new Uint8Array(current);
  if (a.length !== key.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== key[i]) return false;
  return true;
}
