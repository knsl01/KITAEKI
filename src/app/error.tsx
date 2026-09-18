"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-serif text-2xl">Halaman gagal dimuat</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Koneksi ke server terputus atau data tidak terbaca. Coba muat ulang halaman ini.
      </p>
      <Button onClick={reset} className="mt-2">
        Muat ulang
      </Button>
    </div>
  );
}
