"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePush } from "@/hooks/use-push";

const DISMISS_KEY = "kita-push-prompt-dismissed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Ajakan aktifkan notifikasi di dashboard. Hanya muncul kalau perangkat memang bisa
 * (izin belum diminta, dan di iPhone hanya saat sudah dibuka dari Layar Utama).
 * Sekaligus memastikan service worker terdaftar & langganan tersinkron di setiap perangkat.
 */
export function NotificationPrompt() {
  const { status, busy, enable } = usePush();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      setHidden(Date.now() < until);
    } catch {
      setHidden(false);
    }
  }, []);

  if (status !== "off" || hidden) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Aktifkan notifikasi</p>
        <p className="text-xs text-muted-foreground">Tahu langsung saat pasangan mencatat transaksi atau menabung.</p>
      </div>
      <Button size="sm" onClick={enable} disabled={busy}>
        Aktifkan
      </Button>
      <button
        type="button"
        aria-label="Nanti saja"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_MS));
          } catch {}
          setHidden(true);
        }}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
