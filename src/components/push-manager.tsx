"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeToPush } from "@/app/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
          setIsLoading(false);
        });
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  async function handleSubscribe() {
    if (!VAPID_PUBLIC_KEY) {
      alert("VAPID_PUBLIC_KEY belum dikonfigurasi di .env.local");
      return;
    }

    try {
      setIsLoading(true);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Izin notifikasi ditolak");
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const res = await subscribeToPush(sub.toJSON());
      if (res.ok) {
        setIsSubscribed(true);
      } else {
        alert("Gagal menyimpan langganan notifikasi");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal berlangganan notifikasi");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isSupported) {
    return <p className="text-xs text-muted-foreground">Browser ini tidak mendukung Push Notification.</p>;
  }

  return (
    <Button
      variant={isSubscribed ? "outline" : "default"}
      size="sm"
      onClick={handleSubscribe}
      disabled={isLoading || isSubscribed}
      className="w-full sm:w-auto"
    >
      {isSubscribed ? <BellOff className="h-4 w-4 mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
      {isSubscribed ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
    </Button>
  );
}
