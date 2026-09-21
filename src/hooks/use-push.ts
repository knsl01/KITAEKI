"use client";

import { useCallback, useEffect, useState } from "react";
import { sendTestPush, subscribeToPush, unsubscribeFromPush, type PushTestResult } from "@/app/actions/push";
import {
  VAPID_PUBLIC_KEY,
  detectPushEnv,
  registerServiceWorker,
  sameApplicationServerKey,
  urlBase64ToUint8Array,
} from "@/lib/push-client";

export type PushStatus =
  | "loading"
  | "unsupported" // browser tidak punya Push API (mis. iOS < 16.4)
  | "ios-install" // iPhone/iPad tapi belum dipasang ke Layar Utama
  | "denied" // izin ditolak di pengaturan perangkat
  | "off" // bisa diaktifkan
  | "on";

const SYNC_KEY = "kita-push-synced";

export function usePush() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<PushTestResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      const env = detectPushEnv();
      if (!env.hasServiceWorker) return setStatus("unsupported");
      if (env.isIOS && !env.standalone) return setStatus("ios-install");
      if (!env.hasPush) return setStatus("unsupported");

      const reg = await registerServiceWorker();
      if (Notification.permission === "denied") return setStatus("denied");

      let sub = await reg.pushManager.getSubscription();

      // Izin sudah diberikan tapi langganan hilang (browser membersihkannya / kunci berubah): pulihkan diam-diam.
      if (Notification.permission === "granted" && VAPID_PUBLIC_KEY) {
        const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        if (sub && !sameApplicationServerKey(sub, key)) {
          await sub.unsubscribe();
          sub = null;
        }
        if (!sub) {
          try {
            sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
          } catch {
            sub = null;
          }
        }
      }

      if (sub && Notification.permission === "granted") {
        setStatus("on");
        // Sinkronkan ke server sekali per sesi tab: menjaga baris DB tetap ada dan memindahkan
        // kepemilikan kalau HP ini dipakai gantian akun.
        try {
          if (sessionStorage.getItem(SYNC_KEY) !== sub.endpoint) {
            const res = await subscribeToPush(sub.toJSON(), navigator.userAgent);
            if (res.ok) sessionStorage.setItem(SYNC_KEY, sub.endpoint);
          }
        } catch {
          /* tidak kritis */
        }
      } else {
        setStatus("off");
      }
    } catch (err) {
      console.error("[push] refresh:", err);
      setStatus("unsupported");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** HARUS dipanggil langsung dari klik/tap — iOS menolak meminta izin di luar gestur user. */
  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    setTest(null);
    try {
      if (!VAPID_PUBLIC_KEY) {
        throw new Error(
          "NEXT_PUBLIC_VAPID_PUBLIC_KEY belum ada di build ini. Isi di environment hosting lalu Redeploy (variabel NEXT_PUBLIC_ ditanam saat build)."
        );
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        throw new Error(
          permission === "denied"
            ? "Izin notifikasi ditolak. Aktifkan lewat pengaturan perangkat."
            : "Izin notifikasi belum diberikan."
        );
      }

      const reg = await registerServiceWorker();
      const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      let sub = await reg.pushManager.getSubscription();
      if (sub && !sameApplicationServerKey(sub, key)) {
        await sub.unsubscribe();
        sub = null;
      }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

      const res = await subscribeToPush(sub.toJSON(), navigator.userAgent);
      if (!res.ok) throw new Error(res.error);

      sessionStorage.setItem(SYNC_KEY, sub.endpoint);
      setStatus("on");
    } catch (err) {
      setError((err as Error).message || "Gagal mengaktifkan notifikasi.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    setTest(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      sessionStorage.removeItem(SYNC_KEY);
      setStatus("off");
    } catch (err) {
      setError((err as Error).message || "Gagal menonaktifkan notifikasi.");
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setError(null);
    setTest(null);
    try {
      setTest(await sendTestPush());
    } catch (err) {
      setTest({ ok: false, sent: 0, total: 0, message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, error, test, enable, disable, sendTest, refresh };
}
