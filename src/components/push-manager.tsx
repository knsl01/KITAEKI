"use client";

import { Bell, BellOff, BellRing, Send, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePush } from "@/hooks/use-push";

/** Kartu pengaturan notifikasi (halaman Pengaturan). */
export function PushManager() {
  const { status, busy, error, test, enable, disable, sendTest } = usePush();

  if (status === "loading") {
    return <p className="text-xs text-muted-foreground">Memeriksa dukungan notifikasi…</p>;
  }

  if (status === "ios-install") {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <Smartphone className="h-4 w-4" /> Di iPhone, notifikasi hanya jalan dari aplikasi yang dipasang
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>
            Buka KITA di <strong className="text-foreground">Safari</strong>, ketuk tombol{" "}
            <Share className="inline h-3.5 w-3.5 -translate-y-px" /> <strong className="text-foreground">Bagikan</strong>.
          </li>
          <li>
            Pilih <strong className="text-foreground">Tambah ke Layar Utama</strong>, lalu <strong className="text-foreground">Tambah</strong>.
          </li>
          <li>Tutup Safari, buka KITA dari ikon di Layar Utama.</li>
          <li>
            Masuk ke <strong className="text-foreground">Pengaturan → Notifikasi</strong> dan tekan{" "}
            <strong className="text-foreground">Aktifkan notifikasi</strong>.
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">Butuh iOS/iPadOS 16.4 atau lebih baru.</p>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Browser ini belum mendukung notifikasi push. Coba Chrome, Edge, Firefox, atau Safari terbaru (di iPhone: iOS 16.4+
        dan pasang ke Layar Utama).
      </p>
    );
  }

  if (status === "denied") {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-semibold">Izin notifikasi sedang diblokir</p>
        <p className="text-muted-foreground">
          Buka <strong className="text-foreground">Pengaturan perangkat → Notifikasi → KITA</strong> (iPhone/Android) atau ikon gembok
          di address bar (desktop), izinkan notifikasi, lalu muat ulang halaman ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "on" ? (
          <>
            <Button variant="subtle" size="sm" onClick={sendTest} disabled={busy}>
              <Send className="h-4 w-4" /> Kirim notifikasi tes
            </Button>
            <Button variant="outline" size="sm" onClick={disable} disabled={busy}>
              <BellOff className="h-4 w-4" /> Nonaktifkan
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={enable} disabled={busy}>
            <Bell className="h-4 w-4" /> {busy ? "Mengaktifkan…" : "Aktifkan notifikasi"}
          </Button>
        )}
      </div>

      {status === "on" && !test && !error && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BellRing className="h-3.5 w-3.5 text-emerald-500" /> Aktif di perangkat ini. Kamu akan diberi tahu saat ada transaksi,
          tabungan, tugas, dan belanja baru.
        </p>
      )}

      {test && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-xs ${
            test.ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
          }`}
        >
          {test.message}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
