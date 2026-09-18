"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Unggah gambar langsung ke Supabase Storage dari browser.
 * File disimpan di folder household, jadi hanya pasangan itu yang bisa menulis.
 */
export function MediaUpload({
  householdId,
  folder,
  value,
  onChange,
  className,
  label = "Unggah gambar",
}: {
  householdId: string;
  folder: string;
  value: string | null;
  onChange: (url: string | null) => void;
  className?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Pilih berkas gambar.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${householdId}/${folder}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("kita-media")
      .upload(path, file, { cacheControl: "31536000", upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setBusy(false);
      return;
    }

    const { data } = supabase.storage.from("kita-media").getPublicUrl(path);
    onChange(data.publicUrl);
    setBusy(false);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-36 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-transform duration-200 hover:scale-110"
            aria-label="Hapus gambar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors duration-200 hover:border-ring/50 hover:bg-muted/40"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          {busy ? "Mengunggah…" : label}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />

      {value ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          Ganti gambar
        </Button>
      ) : null}

      {error ? <p className="text-xs text-[hsl(var(--negative))]">{error}</p> : null}
    </div>
  );
}
