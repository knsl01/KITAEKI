/* KITA — service worker (Web Push). Sengaja tanpa cache offline supaya data keuangan selalu segar. */

const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-96.png"; // siluet putih transparan (dipakai Android/desktop; iOS mengabaikannya)

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  // iOS mewajibkan SETIAP push berujung pada notifikasi yang terlihat. Kalau tidak, Safari mencabut izin
  // setelah beberapa kali. Jadi apa pun yang terjadi (payload kosong / bukan JSON), tetap tampilkan sesuatu.
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    try {
      data = { body: event.data.text() };
    } catch (__) {
      data = {};
    }
  }

  const title = data.title || "KITA";
  const options = {
    body: data.body || "Ada pembaruan baru di KITA.",
    icon: data.icon || ICON,
    badge: BADGE,
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    timestamp: Date.now(),
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if (client.url !== target && "navigate" in client) {
          try {
            await client.navigate(target);
          } catch (_) {
            /* navigasi ditolak — jendela sudah difokuskan, cukup */
          }
        }
        return;
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })()
  );
});
