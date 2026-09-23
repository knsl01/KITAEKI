"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type NudgeRouteError = Error & { digest?: string };

export default function NudgeError({ error, reset }: { error: NudgeRouteError; reset: () => void }) {
  useEffect(() => {
    console.error("Nudge route render failed:", error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[45vh] max-w-xl flex-col items-center justify-center gap-3 px-5 text-center">
      <h1 className="font-serif text-2xl">Nudge belum bisa dibuka</h1>
      <p className="text-sm text-muted-foreground">Terjadi kesalahan saat menampilkan halaman Nudge.</p>
      <pre role="alert" className="kita-scrollbar max-h-40 w-full overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/50 p-3 text-left text-xs text-muted-foreground">
        {error.message || "Tidak ada detail kesalahan dari server."}
        {error.digest ? `\nKode: ${error.digest}` : ""}
      </pre>
      <Button onClick={() => reset()} className="mt-1 min-h-11">Coba muat ulang</Button>
    </section>
  );
}
