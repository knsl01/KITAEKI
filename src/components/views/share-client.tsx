"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, ImagePlus, Share2, Shuffle, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { hashString } from "@/lib/share/canvas";
import { pickQuote, QUOTES } from "@/lib/share/quotes";
import { loadImage, prepareFonts, renderShare } from "@/lib/share/render";
import { THEMES } from "@/lib/share/themes";
import {
  CARD_STYLE_LABEL,
  FORMAT_SIZE,
  PATTERN_IDS,
  PATTERN_LABEL,
  TEMPLATE_IDS,
  TEMPLATE_META,
  type CardStyle,
  type ShareAssets,
  type ShareData,
  type ShareFormat,
  type ShareStyle,
  type TemplateId,
} from "@/lib/share/types";
import { cn } from "@/lib/utils";

const THUMB_W = 180;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-2 text-left">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted-foreground/30")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** Perkecil foto latar supaya canvas & memori tetap ringan. */
async function downscale(file: File, max = 1600): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (!img) throw new Error("Foto tidak bisa dibuka");
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export function ShareClient({ data }: { data: ShareData }) {
  const [style, setStyle] = useState<ShareStyle>(() => ({
    template: "balance",
    theme: "aurora",
    format: "story",
    cardStyle: "glass",
    pattern: "none",
    hideAmounts: false,
    showQr: true,
    showAvatars: true,
    range: 30,
    goalId: null,
    quote: pickQuote(hashString(data.today)),
    caption: "",
  }));
  const [assets, setAssets] = useState<ShareAssets>({ logo: null, avatars: {}, goals: {}, bg: null });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const mainRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = useCallback((p: Partial<ShareStyle>) => setStyle((s) => ({ ...s, ...p })), []);

  /* muat font + gambar sekali */
  useEffect(() => {
    let alive = true;
    (async () => {
      await prepareFonts();
      const [logo, ...rest] = await Promise.all([
        loadImage("/icons/icon-192.png"),
        ...data.members.map((m) => loadImage(m.avatar)),
        ...data.goals.map((g) => loadImage(g.imageUrl)),
      ]);
      if (!alive) return;
      const avatars: ShareAssets["avatars"] = {};
      const goals: ShareAssets["goals"] = {};
      data.members.forEach((m, i) => (avatars[m.key] = rest[i] ?? null));
      data.goals.forEach((g, i) => (goals[g.id] = rest[data.members.length + i] ?? null));
      setAssets((a) => ({ ...a, logo, avatars, goals }));
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [data.members, data.goals]);

  /* pratinjau utama (resolusi penuh) */
  useEffect(() => {
    const c = mainRef.current;
    if (!c || !ready) return;
    const { w, h } = FORMAT_SIZE[style.format];
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    renderShare(c.getContext("2d")!, style, data, assets);
  }, [style, data, assets, ready]);

  /* thumbnail template: digambar bergantian supaya UI tidak tersendat */
  const thumbKey = useMemo(() => {
    const { template: _t, ...rest } = style;
    return JSON.stringify(rest);
  }, [style]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const { w, h } = FORMAT_SIZE[style.format];
    const th = Math.round((THUMB_W * h) / w);
    const timer = window.setTimeout(async () => {
      for (const id of TEMPLATE_IDS) {
        if (cancelled) return;
        const c = thumbRefs.current[id];
        if (c) {
          if (c.width !== THUMB_W || c.height !== th) {
            c.width = THUMB_W;
            c.height = th;
          }
          const ctx = c.getContext("2d")!;
          ctx.save();
          ctx.scale(THUMB_W / w, THUMB_W / w);
          renderShare(ctx, { ...style, template: id }, data, assets);
          ctx.restore();
        }
        await new Promise((r) => setTimeout(r, 0));
      }
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbKey, ready, data, assets]);

  /* aksi */
  const shuffle = () => {
    const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
    patch({
      template: pick(TEMPLATE_IDS),
      theme: pick(THEMES).id,
      cardStyle: pick(["glass", "solid", "line"] as CardStyle[]),
      pattern: pick(PATTERN_IDS),
      quote: pick(QUOTES),
    });
  };

  const toBlob = () =>
    new Promise<Blob>((resolve, reject) => {
      const c = mainRef.current;
      if (!c) return reject(new Error("Kanvas belum siap"));
      try {
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat gambar"))), "image/png");
      } catch (err) {
        reject(err);
      }
    });

  const fileName = () => `kita-${style.template}-${style.format}-${data.today}.png`;

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const blob = await toBlob();
      const url = URL.createObjectURL(blob);
      if (isIOS()) {
        // Safari iOS (terutama mode PWA) tidak andal untuk unduhan: tampilkan gambar agar bisa ditahan → Simpan ke Foto.
        setPreview(url);
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName();
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        setNotice("Gambar tersimpan. Buka Instagram → Story → pilih dari galeri.");
      }
    } catch {
      setNotice("Gagal menyimpan gambar. Kalau memakai foto latar dari luar, coba tanpa foto.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const blob = await toBlob();
      const file = new File([blob], fileName(), { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "KITA", text: style.caption.trim() || data.appUrl });
      } else {
        await save();
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setNotice("Berbagi tidak tersedia di perangkat ini. Pakai tombol Simpan.");
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const img = await loadImage(await downscale(file));
      setAssets((a) => ({ ...a, bg: img }));
    } catch {
      setNotice("Foto tidak bisa dibuka. Coba foto lain.");
    }
  };

  const { w: fw, h: fh } = FORMAT_SIZE[style.format];
  const needsGoal = style.template === "goal" || style.template === "milestone";
  const needsRange = style.template === "balance" || style.template === "trend";

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <PageHeader title="Share Story" description="Pilih desain, atur tampilannya, lalu bagikan pencapaian kalian ke Instagram." />

      <div className="grid min-w-0 gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* pratinjau */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative mx-auto w-full max-w-[320px] sm:w-full sm:max-w-[320px] lg:max-w-none" style={{ width: "min(78vw, 320px)", maxWidth: "100%" }}>
            <canvas
              ref={mainRef}
              aria-label="Pratinjau kartu"
              className="block h-auto w-full max-w-full rounded-[1.6rem] border border-border shadow-2xl"
              style={{ aspectRatio: `${fw} / ${fh}`, background: "hsl(var(--muted))" }}
            />
            {!ready && <div className="absolute inset-0 animate-pulse rounded-[1.6rem] bg-muted/60" />}
          </div>

          <div className="mx-auto mt-4 flex w-full max-w-[320px] gap-2 sm:w-full sm:max-w-[320px] lg:max-w-none" style={{ width: "min(78vw, 320px)", maxWidth: "100%" }}>
            <Button variant="outline" className="flex-1" onClick={shuffle} disabled={!ready}>
              <Shuffle className="h-4 w-4" /> Acak
            </Button>
            <Button variant="subtle" className="flex-1" onClick={save} disabled={!ready || busy}>
              <Download className="h-4 w-4" /> Simpan
            </Button>
            <Button className="flex-1" onClick={share} disabled={!ready || busy}>
              <Share2 className="h-4 w-4" /> Bagikan
            </Button>
          </div>
          {notice && (
            <p role="status" className="mx-auto mt-3 w-full max-w-[320px] text-center text-xs text-muted-foreground sm:w-full sm:max-w-[320px] lg:max-w-none" style={{ width: "min(78vw, 320px)", maxWidth: "100%" }}>
              {notice}
            </p>
          )}
        </div>

        {/* kontrol */}
        <div className="min-w-0 space-y-4">
          <Section title={`Desain (${TEMPLATE_IDS.length})`}>
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible xl:grid-cols-5">
              {TEMPLATE_IDS.map((id: TemplateId) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={style.template === id}
                  onClick={() => patch({ template: id })}
                  className="w-[84px] shrink-0 snap-start text-center lg:w-auto"
                >
                  <canvas
                    ref={(el) => {
                      thumbRefs.current[id] = el;
                    }}
                    className={cn(
                      "block w-full rounded-lg border-2 bg-muted transition-all",
                      style.template === id ? "border-primary shadow-lg" : "border-transparent opacity-80 hover:opacity-100"
                    )}
                    style={{ aspectRatio: `${fw} / ${fh}` }}
                  />
                  <span className={cn("mt-1.5 block text-[11px] font-semibold", style.template === id ? "text-foreground" : "text-muted-foreground")}>
                    {TEMPLATE_META[id].label}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Warna">
            <div className="flex flex-wrap gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-label={t.label}
                  aria-pressed={style.theme === t.id}
                  title={t.label}
                  onClick={() => patch({ theme: t.id })}
                  className={cn("h-11 w-11 rounded-full border-2 transition-transform", style.theme === t.id ? "scale-110 border-primary ring-2 ring-primary/30" : "border-border")}
                  style={{ background: `linear-gradient(135deg, ${t.bg[0]}, ${t.bg[1]} 55%, ${t.bg[2]})` }}
                />
              ))}
            </div>
          </Section>

          <Section title="Tampilan">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Ukuran</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FORMAT_SIZE) as ShareFormat[]).map((f) => (
                    <Chip key={f} active={style.format === f} onClick={() => patch({ format: f })}>
                      {FORMAT_SIZE[f].label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Gaya kartu</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CARD_STYLE_LABEL) as CardStyle[]).map((c) => (
                    <Chip key={c} active={style.cardStyle === c} onClick={() => patch({ cardStyle: c })}>
                      {CARD_STYLE_LABEL[c]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Pola latar</p>
                <div className="flex flex-wrap gap-2">
                  {PATTERN_IDS.map((p) => (
                    <Chip key={p} active={style.pattern === p} onClick={() => patch({ pattern: p })}>
                      {PATTERN_LABEL[p]}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {(needsGoal || needsRange || style.template === "quote") && (
            <Section title="Isi kartu">
              <div className="space-y-4">
                {needsGoal && (
                  <label className="block text-sm">
                    <span className="mb-1.5 block text-xs text-muted-foreground">Target yang ditampilkan</span>
                    <select
                      value={style.goalId ?? ""}
                      onChange={(e) => patch({ goalId: e.target.value || null })}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    >
                      <option value="">{style.template === "milestone" ? "Otomatis (yang paling dekat)" : "Otomatis (progres tertinggi)"}</option>
                      {data.goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {needsRange && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Rentang grafik</p>
                    <div className="flex gap-2">
                      <Chip active={style.range === 30} onClick={() => patch({ range: 30 })}>
                        30 hari
                      </Chip>
                      <Chip active={style.range === 90} onClick={() => patch({ range: 90 })}>
                        90 hari
                      </Chip>
                    </div>
                  </div>
                )}
                {style.template === "quote" && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Kutipan</span>
                      <button type="button" onClick={() => patch({ quote: QUOTES[Math.floor(Math.random() * QUOTES.length)] })} className="text-xs font-semibold text-primary">
                        Acak kutipan
                      </button>
                    </div>
                    <textarea
                      value={style.quote}
                      onChange={(e) => patch({ quote: e.target.value.slice(0, 220) })}
                      rows={3}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section title="Opsi">
            <div className="divide-y divide-border">
              <Toggle label="Sembunyikan nominal" hint="Angka diganti titik — cocok kalau dibagikan ke publik" checked={style.hideAmounts} onChange={(v) => patch({ hideAmounts: v })} />
              <Toggle label="Tampilkan QR code" hint={`Mengarah ke ${data.appUrl.replace(/^https?:\/\//, "")}`} checked={style.showQr} onChange={(v) => patch({ showQr: v })} />
              <Toggle label="Tampilkan foto profil" checked={style.showAvatars} onChange={(v) => patch({ showAvatars: v })} />
            </div>

            <label className="mt-3 block text-sm">
              <span className="mb-1.5 block text-xs text-muted-foreground">Teks di bawah (opsional)</span>
              <input
                value={style.caption}
                onChange={(e) => patch({ caption: e.target.value.slice(0, 48) })}
                placeholder="Kelola keuangan berdua"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </label>

            <div className="mt-3 flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-4 w-4" /> {assets.bg ? "Ganti foto latar" : "Foto latar"}
              </Button>
              {assets.bg && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAssets((a) => ({ ...a, bg: null }));
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4" /> Hapus
                </Button>
              )}
            </div>
          </Section>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/85 p-5" role="dialog" aria-modal="true" aria-label="Simpan gambar">
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => {
              URL.revokeObjectURL(preview);
              setPreview(null);
            }}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-white/15 p-2 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Kartu KITA" className="max-h-[70vh] w-auto rounded-2xl shadow-2xl" />
          <p className="max-w-xs text-center text-sm text-white/90">Tahan gambar lalu pilih <strong>Simpan ke Foto</strong>, setelah itu bagikan ke Story Instagram.</p>
        </div>
      )}
    </div>
  );
}
