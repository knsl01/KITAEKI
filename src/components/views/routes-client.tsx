"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock3, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { createRouteStop, deleteRouteStop, findRouteLocation, toggleRouteStop } from "@/app/actions/routes";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OWNER_LABEL, type MemberOwner } from "@/lib/types";
import { FreeRouteMap, type RouteMapPoint } from "@/components/views/free-route-map";
import type { GeoapifyPlace } from "@/lib/geoapify";

export type RouteStop = {
  id: string;
  title: string;
  location: string;
  detail: string | null;
  starts_on: string;
  starts_at: string | null;
  owner: MemberOwner;
  latitude: number | null;
  longitude: number | null;
  route_order: number;
  is_done: boolean;
};

export function RoutesClient({ stops: initialStops, defaultOwner, today }: { stops: RouteStop[]; defaultOwner: MemberOwner; today: string }) {
  const router = useRouter();
  const [stops, setStops] = useState(initialStops);
  const [date, setDate] = useState(today);
  const [pending, startTransition] = useTransition();
  const [finding, setFinding] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setStops(initialStops), [initialStops]);
  const dayStops = useMemo(() => stops.filter((stop) => stop.starts_on === date).sort((a, b) => (a.starts_at ?? "99:99").localeCompare(b.starts_at ?? "99:99") || a.route_order - b.route_order), [stops, date]);
  const points: RouteMapPoint[] = dayStops.flatMap((stop, index) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)
    ? [{ id: stop.id, title: stop.title, lat: stop.latitude as number, lon: stop.longitude as number, order: index + 1 }]
    : []);

  function onPlaceSelected(place: GeoapifyPlace): void {
    setLocationText(place.address === "Alamat tidak tersedia" ? place.name : `${place.name}, ${place.address}`);
    setSelectedCoordinates({ latitude: place.latitude, longitude: place.longitude });
  }

  async function submit(formData: FormData): Promise<void> {
    setError("");
    setMessage("");
    const location = String(formData.get("location") ?? "").trim();
    let coordinates = selectedCoordinates;
    if (!coordinates) {
      setFinding(true);
      coordinates = await findRouteLocation(location);
      setFinding(false);
    }
    if (coordinates) {
      formData.set("latitude", String(coordinates.latitude));
      formData.set("longitude", String(coordinates.longitude));
    }
    formData.set("starts_on", date);
    startTransition(async () => {
      const result = await createRouteStop(formData);
      if (!result.ok) { setError(result.error); return; }
      setMessage(coordinates ? "Rencana dan lokasi berhasil ditambahkan." : "Rencana ditambahkan; koordinat belum ditemukan.");
      (document.getElementById("route-stop-form") as HTMLFormElement | null)?.reset();
      setLocationText("");
      setSelectedCoordinates(null);
      router.refresh();
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      const result = await deleteRouteStop(id);
      if (!result.ok) { setError(result.error); return; }
      setStops((current) => current.filter((stop) => stop.id !== id));
    });
  }

  function toggleDone(stop: RouteStop): void {
    startTransition(async () => {
      const result = await toggleRouteStop(stop.id, !stop.is_done);
      if (!result.ok) { setError(result.error); return; }
      setStops((current) => current.map((item) => item.id === stop.id ? { ...item, is_done: !item.is_done } : item));
    });
  }

  return <div className="space-y-5">
    <PageHeader title="Rute & Rencana" description="Susun tempat yang akan didatangi, jamnya, dan siapa yang ikut." />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
      <div className="space-y-4">
        <Card><CardContent className="flex flex-wrap items-end justify-between gap-3 pt-5">
          <div><p className="text-sm text-muted-foreground">Rencana untuk tanggal</p><div className="mt-2 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-auto" /></div></div>
          <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setDate(today)}>Hari ini</Button><Button type="button" variant="outline" size="sm" onClick={() => { const next = new Date(today + "T12:00:00"); next.setDate(next.getDate() + 1); setDate(next.getFullYear() + "-" + String(next.getMonth() + 1).padStart(2, "0") + "-" + String(next.getDate()).padStart(2, "0")); }}>Besok</Button></div>
        </CardContent></Card>
        <FreeRouteMap points={points} locations={dayStops.map((stop) => stop.location)} onPlaceSelected={onPlaceSelected} />
        <Card><CardHeader><CardTitle>Urutan perjalanan</CardTitle></CardHeader><CardContent>
          {dayStops.length ? <ol className="space-y-3">{dayStops.map((stop, index) => <li key={stop.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className={stop.is_done ? "font-semibold line-through text-muted-foreground" : "font-semibold"}>{stop.title}</p>{stop.starts_at ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{stop.starts_at.slice(0, 5)}</span> : <span className="text-xs text-muted-foreground">Waktu fleksibel</span>}<span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{OWNER_LABEL[stop.owner]}</span></div><p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{stop.location}</p>{stop.detail ? <p className="mt-1 text-xs text-muted-foreground">{stop.detail}</p> : null}</div>
            <Button type="button" variant={stop.is_done ? "subtle" : "outline"} size="icon" aria-label={stop.is_done ? "Tandai belum selesai" : "Tandai selesai"} aria-pressed={stop.is_done} onClick={() => toggleDone(stop)} disabled={pending}><Check className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label={"Hapus " + stop.title} onClick={() => remove(stop.id)} disabled={pending}><Trash2 className="h-4 w-4" /></Button>
          </li>)}</ol> : <div className="py-10 text-center"><MapPin className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 font-medium">Belum ada tujuan di tanggal ini</p><p className="mt-1 text-sm text-muted-foreground">Tambahkan tempat di formulir untuk menyusun rute.</p></div>}
        </CardContent></Card>
      </div>
      <Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Tambah tujuan</CardTitle><p className="text-sm text-muted-foreground">Cari di peta atau tulis alamat tujuan.</p></CardHeader><CardContent>
        <form id="route-stop-form" action={submit} className="space-y-3">
          <Input name="title" placeholder="Nama kegiatan, mis. Makan siang" required maxLength={120} />
          <Input name="location" value={locationText} onChange={(event) => { setLocationText(event.target.value); setSelectedCoordinates(null); }} placeholder="Pilih hasil pencarian atau ketik alamat" required maxLength={240} />
          <div className="grid grid-cols-2 gap-3"><Input name="starts_at" type="time" aria-label="Jam" /><Select name="owner" defaultValue={defaultOwner}><option value="shared">Bersama</option><option value="eki">Eki</option><option value="dinda">Dinda</option></Select></div>
          <Textarea name="detail" placeholder="Catatan (opsional), mis. reservasi jam 12" maxLength={1000} />
          {error ? <p role="alert" className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p> : null}
          {message ? <p role="status" className="rounded-lg bg-positive/10 px-3 py-2 text-sm text-positive">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={pending || finding}>{finding || pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}{finding ? "Mencari lokasi…" : pending ? "Menyimpan…" : "Tambahkan ke rute"}</Button>
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">Pencarian alamat, tempat, dan rute menggunakan Geoapify.</p>
        </form>
      </CardContent></Card>
    </div>
  </div>;
}
