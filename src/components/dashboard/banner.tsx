"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { updateBanner } from "@/app/actions/workspace";
import { MediaUpload } from "@/components/media-upload";
import type { ViewKey } from "@/components/member-switcher";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type BannerSettings = {
  banner_image_url: string | null;
  banner_title: string;
  banner_subtitle: string;
  banner_quote: string;
};

export function DashboardBanner({
  settings,
  householdId,
  coupleName,
  view,
  labels,
  monthLabel,
  actions,
}: {
  settings: BannerSettings;
  householdId: string;
  coupleName: string;
  view: ViewKey;
  labels: { eki: string; dinda: string };
  monthLabel: string;
  /** Tombol tambahan di sebelah tombol ubah banner. */
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(settings.banner_image_url);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("banner_image_url", image ?? "");
    startTransition(async () => {
      const result = await updateBanner(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="relative isolate overflow-hidden rounded-[var(--widget-radius)] bg-sidebar text-white">
      {settings.banner_image_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.banner_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-neutral-950/55" />
        </>
      ) : null}

      <div className="relative flex min-h-[200px] flex-col justify-between gap-6 p-6 sm:p-8 lg:min-h-[220px] lg:flex-row lg:items-end">
        <div className="max-w-xl">
          <h1 className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
            {settings.banner_title}, {coupleName}
          </h1>
          {settings.banner_subtitle ? (
            <p className="mt-2 text-sm text-white/75">{settings.banner_subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-4 lg:flex-col lg:items-end">
          {settings.banner_quote ? (
            <p className="max-w-[16rem] font-serif text-lg font-medium italic leading-snug text-white/85">
              {settings.banner_quote}
            </p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/60">{monthLabel}</span>
            {actions}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="icon-lift h-8 w-8 bg-white/10 text-white hover:bg-white/20"
                  aria-label="Ubah banner"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ubah banner</DialogTitle>
                  <DialogDescription>
                    Ganti foto dan tulisan yang muncul di atas dashboard kalian.
                  </DialogDescription>
                </DialogHeader>

                <form action={onSubmit} className="space-y-4">
                  <MediaUpload
                    householdId={householdId}
                    folder="banner"
                    value={image}
                    onChange={setImage}
                    label="Unggah foto banner"
                    aspect={3 / 1}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="banner_title">Sapaan</Label>
                    <Input id="banner_title" name="banner_title" defaultValue={settings.banner_title} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="banner_subtitle">Kalimat pendukung</Label>
                    <Input
                      id="banner_subtitle"
                      name="banner_subtitle"
                      defaultValue={settings.banner_subtitle}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="banner_quote">Kutipan</Label>
                    <Textarea
                      id="banner_quote"
                      name="banner_quote"
                      rows={2}
                      defaultValue={settings.banner_quote}
                    />
                  </div>

                  {error ? (
                    <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={pending}>
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Simpan banner
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </section>
  );
}
