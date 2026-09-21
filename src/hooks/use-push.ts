"use client";

import { useCallback, useEffect, useState } from "react";
import { sendTestPush, subscribeToPush, unsubscribeFromPush, type PushTestResult } from "@/app/actions/push";

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function detectPushEnv() {
  if (typeof window === "undefined") return { supported: false, reason: "ssr" };
  if (!("serviceWorker" in navigator)) return { supported: false, reason: "no-sw" };
  if (!("PushManager" in window)) return { supported: false, reason: "no-push" };
  if (!VAPID_PUBLIC_KEY) return { supported: false, reason: "no-vapid-key" };
  return { supported: true, reason: null };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type PushStatus = "idle" | "loading" | "subscribed" | "unsubscribed" | "error";

export interface UsePushReturn {
  status: PushStatus;
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  /** Alias for isLoading — true while any async operation is in-flight. */
  busy: boolean;
  error: string | null;
  testResult: PushTestResult | null;
  subscribe: () => Promise<void>;
  /** Alias for subscribe — request permission and register push subscription. */
  enable: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  testPush: () => Promise<void>;
}

export function usePush(): UsePushReturn {
  const [status, setStatus] = useState<PushStatus>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<PushTestResult | null>(null);

  // Check initial subscription state
  useEffect(() => {
    const env = detectPushEnv();
    if (!env.supported) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    setIsSupported(true);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub);
        setStatus(sub ? "subscribed" : "unsubscribed");
      })
      .catch((err) => {
        console.error("Service worker registration failed:", err);
        setError("Gagal mendaftarkan service worker.");
        setStatus("error");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Izin notifikasi ditolak oleh browser.");
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const result = await subscribeToPush(sub.toJSON());
      if (!result.ok) {
        throw new Error((result as { ok: false; error: string }).error);
      }

      setIsSubscribed(true);
      setStatus("subscribed");
    } catch (err: any) {
      console.error("Subscribe error:", err);
      setError(err?.message ?? "Gagal mengaktifkan notifikasi.");
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    setError(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await unsubscribeFromPush(endpoint);
      }

      setIsSubscribed(false);
      setStatus("unsubscribed");
    } catch (err: any) {
      console.error("Unsubscribe error:", err);
      setError(err?.message ?? "Gagal menonaktifkan notifikasi.");
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const testPush = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const result = await sendTestPush();
      setTestResult(result);
      if (!result.ok) {
        setError(result.message);
      }
    } catch (err: any) {
      console.error("Test push error:", err);
      const msg = err?.message ?? "Gagal mengirim notifikasi test.";
      setError(msg);
      setTestResult({ ok: false, message: msg });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    status,
    isSupported,
    isSubscribed,
    isLoading,
    busy: isLoading,
    error,
    testResult,
    subscribe,
    enable: subscribe,
    unsubscribe,
    testPush,
  };
}
