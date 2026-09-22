"use client";

import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock3, LocateFixed, Loader2, MapPin, Minus, Navigation, Plus, Trash2 } from "lucide-react";
import { createRouteStop, deleteRouteStop, findRouteLocation, toggleRouteStop } from "@/app/actions/routes";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OWNER_LABEL, type MemberOwner } from "@/lib/types";
import { useElementSize } from "@/hooks/use-element-size";
import { FreeRouteMap } from "@/components/views/free-route-map";

export type RouteStop = {
  id: string; title: string; location: string; detail: string | null; starts_on: string;
  starts_at: string | null; owner: MemberOwner; latitude: number | null; longitude: number | null; route_order: number; is_done: boolean;
};
type Point = { id: string; title: string; lat: number; lon: number; order: number; kind?: "stop" | "user" | "default" };
type Tile = { key: string; url: string; left: number; top: number };

const tileX = (lon: number, zoom: number) => ((lon + 180) / 360) * 2 ** zoom;
const tileY = (lat: number, zoom: number) => {
  const rad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * 2 ** zoom;
};

function RouteMap({ points, locations }: { points: Point[]; locations: string[] }) {
  const [mapRef, mapSize] = useElementSize<HTMLDivElement>({ width: 900, height: 360 });
  const width = mapSize.width || 900, height = mapSize.height || 360;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const mapPoints = useMemo(() => {
    const withUser = userLocation ? [...points, { id: "user-location", title: "Lokasi saya", lat: userLocation.latitude, lon: userLocation.longitude, order: 0, kind: "user" as const }] : points;
    return withUser.length ? withUser : [{ id: "default-indonesia", title: "Indonesia", lat: -2.5, lon: 118, order: 0, kind: "default" as const }];
  }, [points, userLocation]);
  const map = useMemo(() => {
    let chosenZoom = 15, projected: { point: Point; x: number; y: number }[] = [];
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (let zoom = points.length || userLocation ? 15 : 3; zoom >= 3; zoom--) {
      const current = mapPoints.map((point) => ({ point, x: tileX(point.lon, zoom) * 256, y: tileY(point.lat, zoom) * 256 }));
      const xs = current.map((point) => point.x), ys = current.map((point) => point.y);
      const loX = Math.min(...xs), hiX = Math.max(...xs), loY = Math.min(...ys), hiY = Math.max(...ys);
      const scale = Math.min((width - 120) / Math.max(256, hiX - loX + 96), (height - 100) / Math.max(256, hiY - loY + 96));
      if (scale >= 0.85 || zoom === 3) { chosenZoom = zoom; projected = current; minX = loX; maxX = hiX; minY = loY; maxY = hiY; break; }
    }
    const scale = Math.min((width - 120) / Math.max(256, maxX - minX + 96), (height - 100) / Math.max(256, maxY - minY + 96));
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
    const originX = width / 2 - centerX * scale, originY = height / 2 - centerY * scale;
    const coords = projected.map(({ point, x, y }) => ({ ...point, x: x * scale + originX, y: y * scale + originY }));
    const worldTiles = 2 ** chosenZoom;
    const firstX = Math.floor((centerX - width / (2 * scale)) / 256) - 2, lastX = Math.floor((centerX + width / (2 * scale)) / 256) + 2;
    const firstY = Math.floor((centerY - height / (2 * scale)) / 256) - 2, lastY = Math.floor((centerY + height / (2 * scale)) / 256) + 2;
    const tiles: Tile[] = [];
    for (let x = firstX; x <= lastX; x++) for (let y = firstY; y <= lastY; y++) {
      if (y < 0 || y >= worldTiles) continue;
      const wrappedX = ((x % worldTiles) + worldTiles) % worldTiles;
      tiles.push({ key: x + "-" + y, url: "https://tile.openstreetmap.org/" + chosenZoom + "/" + wrappedX + "/" + y + ".png", left: x * 256 * scale + originX, top: y * 256 * scale + originY });
    }
    return { coords, tiles, scale };
  }, [mapPoints, points.length, userLocation, width, height]);
  const routeLink = points.length
    ? "https://www.google.com/maps/dir/" + points.map((point) => point.lat + "," + point.lon).join("/")
    : "https://www.google.com/maps/search/" + encodeURIComponent(locations.join(" "));

  function locateMe() {
    setLocationError("");
    if (!window.isSecureContext) {
      setLocationError("Lokasi perangkat hanya bisa dipakai melalui koneksi HTTPS.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("Browser ini tidak mendukung lokasi perangkat.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setPan({ x: 0, y: 0 });
        setZoom(1);
        setLocating(false);
      },
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED
          ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk KITA di pengaturan browser."
          : "Lokasi belum bisa didapat. Coba lagi di luar ruangan atau periksa GPS.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  function zoomBy(factor: number) {
    setZoom((current) => Math.min(3, Math.max(0.75, current * factor)));
  }

  return <Card className="overflow-hidden">
    <CardHeader className="flex-row items-center justify-between gap-3">
      <div><CardTitle>Peta rute</CardTitle><p className="mt-1 text-xs text-muted-foreground">{locations.length} titik · urutan mengikuti jadwal</p></div>
      {locations.length ? <Button asChild size="sm" variant="outline"><a href={routeLink} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" /> Buka rute</a></Button> : null}
    </CardHeader>
    <CardContent>{map ? <div ref={mapRef} className="relative h-[300px] touch-none overflow-hidden rounded-xl border border-border bg-muted cursor-grab active:cursor-grabbing sm:h-[360px]"
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button, a")) return;
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setPan({ x: drag.panX + event.clientX - drag.startX, y: drag.panY + event.clientY - drag.startY });
      }}
      onPointerUp={(event) => { if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null; }}
      onPointerCancel={() => { dragRef.current = null; }}
      onWheel={(event) => { event.preventDefault(); zoomBy(event.deltaY < 0 ? 1.12 : 0.89); }}
    >
      <div className="absolute inset-0" style={{ transform: "translate(" + pan.x + "px, " + pan.y + "px) scale(" + zoom + ")", transformOrigin: "center", transition: dragRef.current ? "none" : "transform 120ms ease-out" }}>
        {map.tiles.map((tile) => <img key={tile.key} src={tile.url} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: tile.left, top: tile.top, width: 256 * map.scale, height: 256 * map.scale }} />)}
        <svg viewBox={"0 0 " + width + " " + height} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          {map.coords.filter((point) => point.kind === "stop").length > 1 ? <polyline points={map.coords.filter((point) => point.kind === "stop").map((point) => point.x + "," + point.y).join(" ")} fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 8" vectorEffect="non-scaling-stroke" /> : null}
          {map.coords.filter((point) => point.kind === "stop" || point.kind === "user").map((point) => point.kind === "user"
            ? <g key={point.id}><circle cx={point.x} cy={point.y} r="14" fill="#1688f8" stroke="white" strokeWidth="4" /><circle cx={point.x} cy={point.y} r="4" fill="white" /><title>Lokasi saya</title></g>
            : <g key={point.id}><circle cx={point.x} cy={point.y} r="17" fill="hsl(var(--primary))" stroke="white" strokeWidth="3" /><text x={point.x} y={point.y + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="700">{point.order}</text><title>{point.title}</title></g>)}
        </svg>
      </div>
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-md">
        <Button type="button" variant="ghost" size="icon" aria-label="Perbesar peta" onClick={() => zoomBy(1.25)}><Plus className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Perkecil peta" onClick={() => zoomBy(0.8)}><Minus className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Tampilkan lokasi saya" onClick={locateMe} disabled={locating}>{locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}</Button>
      </div>
      {locationError ? <p role="alert" className="absolute bottom-7 left-2 z-10 max-w-[75%] rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-md">{locationError}</p> : null}
      {!points.length ? <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-border bg-background/90 px-3 py-2 text-xs shadow-sm">Peta siap — tambahkan tujuan untuk menggambar rute.</div> : null}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute bottom-1 right-1 z-10 rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-foreground">© OpenStreetMap contributors</a>
    </div> : <div className="flex h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-5 text-center sm:h-[360px]">
      <MapPin className="h-8 w-8 text-primary" /><p className="mt-3 font-medium">Peta akan muncul setelah lokasi ditemukan</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Tambahkan tujuan dan cari koordinatnya. Nama lokasi tetap bisa disimpan bila pencarian koordinat belum tersedia.</p>
    </div>}</CardContent>
  </Card>;
}

export function RoutesClient({ stops: initialStops, defaultOwner, today }: { stops: RouteStop[]; defaultOwner: MemberOwner; today: string }) {
  const router = useRouter();
  const [stops, setStops] = useState(initialStops);
  const [date, setDate] = useState(today);
  const [pending, startTransition] = useTransition();
  const [finding, setFinding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setStops(initialStops), [initialStops]);
  const dayStops = useMemo(() => stops.filter((stop) => stop.starts_on === date).sort((a, b) => (a.starts_at ?? "99:99").localeCompare(b.starts_at ?? "99:99") || a.route_order - b.route_order), [stops, date]);
  const points = dayStops.flatMap((stop, index) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude) ? [{ id: stop.id, title: stop.title, lat: stop.latitude as number, lon: stop.longitude as number, order: index + 1, kind: "stop" as const }] : []);

  async function submit(formData: FormData) {
    setError(""); setMessage("");
    const location = String(formData.get("location") ?? "").trim();
    setFinding(true);
    const coords = await findRouteLocation(location);
    setFinding(false);
    if (coords) { formData.set("latitude", String(coords.latitude)); formData.set("longitude", String(coords.longitude)); }
    formData.set("starts_on", date);
    startTransition(async () => {
      const result = await createRouteStop(formData);
      if (!result.ok) { setError(result.error); return; }
      setMessage(coords ? "Rencana dan lokasi berhasil ditambahkan." : "Rencana ditambahkan; koordinat belum ditemukan.");
      (document.getElementById("route-stop-form") as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteRouteStop(id);
      if (!result.ok) { setError(result.error); return; }
      setStops((current) => current.filter((stop) => stop.id !== id));
    });
  }

  function toggleDone(stop: RouteStop) {
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
        <FreeRouteMap points={points} locations={dayStops.map((stop) => stop.location)} />
        <Card><CardHeader><CardTitle>Urutan perjalanan</CardTitle></CardHeader><CardContent>
          {dayStops.length ? <ol className="space-y-3">{dayStops.map((stop, index) => <li key={stop.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className={stop.is_done ? "font-semibold line-through text-muted-foreground" : "font-semibold"}>{stop.title}</p>{stop.starts_at ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{stop.starts_at.slice(0, 5)}</span> : <span className="text-xs text-muted-foreground">Waktu fleksibel</span>}<span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{OWNER_LABEL[stop.owner]}</span></div><p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{stop.location}</p>{stop.detail ? <p className="mt-1 text-xs text-muted-foreground">{stop.detail}</p> : null}</div>
            <Button type="button" variant={stop.is_done ? "subtle" : "outline"} size="icon" aria-label={stop.is_done ? "Tandai belum selesai" : "Tandai selesai"} aria-pressed={stop.is_done} onClick={() => toggleDone(stop)} disabled={pending}><Check className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label={"Hapus " + stop.title} onClick={() => remove(stop.id)} disabled={pending}><Trash2 className="h-4 w-4" /></Button>
          </li>)}</ol> : <div className="py-10 text-center"><MapPin className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 font-medium">Belum ada tujuan di tanggal ini</p><p className="mt-1 text-sm text-muted-foreground">Tambahkan tempat di formulir untuk menyusun rute.</p></div>}
        </CardContent></Card>
      </div>
      <Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Tambah tujuan</CardTitle><p className="text-sm text-muted-foreground">Cari tempat agar titiknya tampil di peta.</p></CardHeader><CardContent>
        <form id="route-stop-form" action={submit} className="space-y-3">
          <Input name="title" placeholder="Nama kegiatan, mis. Makan siang" required maxLength={120} />
          <Input name="location" placeholder="Tempat atau alamat tujuan" required maxLength={240} />
          <div className="grid grid-cols-2 gap-3"><Input name="starts_at" type="time" aria-label="Jam" /><Select name="owner" defaultValue={defaultOwner}><option value="shared">Bersama</option><option value="eki">Eki</option><option value="dinda">Dinda</option></Select></div>
          <Textarea name="detail" placeholder="Catatan (opsional), mis. reservasi jam 12" maxLength={1000} />
          {error ? <p role="alert" className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p> : null}
          {message ? <p role="status" className="rounded-lg bg-positive/10 px-3 py-2 text-sm text-positive">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={pending || finding}>{finding || pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}{finding ? "Mencari lokasi…" : pending ? "Menyimpan…" : "Tambahkan ke rute"}</Button>
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">Pencarian tempat memakai Photon dan OpenStreetMap. Jika pencarian tidak tersedia, alamat tetap tersimpan.</p>
        </form>
      </CardContent></Card>
    </div>
  </div>;
}
