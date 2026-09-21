"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePush } from "@/hooks/use-push";

/**
 * Floating prompt that asks users to enable push notifications.
 * Auto-hides if already subscribed or if the user dismisses it.
 */
export function NotificationPrompt() {
  const { status, busy, enable } = usePush();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // Only show the prompt when we know push is available but not yet subscribed
    if (status === "unsubscribed") {
      const dismissed = sessionStorage.getItem("push-prompt-dismissed");
      if (!dismissed) setHidden(false);
    }
  }, [status]);

  if (hidden || status === "subscribed" || status === "idle") return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="shrink-0 rounded-full bg-primary/10 p-2">
          <Bell className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Aktifkan Notifikasi</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dapatkan pemberitahuan saat ada aktivitas baru di rumah tangga kamu.
          </p>

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                await enable();
                setHidden(true);
              }}
            >
              {busy ? "Mengaktifkan…" : "Aktifkan"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                sessionStorage.setItem("push-prompt-dismissed", "1");
                setHidden(true);
              }}
            >
              Nanti saja
            </Button>
          </div>
        </div>

        <button
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => {
            sessionStorage.setItem("push-prompt-dismissed", "1");
            setHidden(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
