"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import { Bike, CarFront, Clock3, Footprints, LocateFixed, Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { fetchRoute, friendlyGeoapifyError, geoapifyApiKey, searchAddresses, searchPlaces } from "@/lib/geoapify";
import type { GeoapifyPlace, GeoapifyRouteResult } from "@/lib/geoapify";
import type { GeoapifyTravelMode } from "@/lib/geoapify/routing";

export type RouteMapPoint = { id: string; title: string; lat: number; lon: number; order: number };
type Coordinate = { latitude: number; longitude: number };
type OverlayGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: number[][] }
  | { type: "MultiLineString"; coordinates: number[][][] };
type OverlayFeature = { type: "Feature"; properties: { kind: string; label?: string; distance?: number; time?: number }; geometry: OverlayGeometry };
type Props = {
  points: RouteMapPoint[];
  locations: string[];
  onPlaceSelected?: (place: GeoapifyPlace) => void;
};

const FALLBACK_CENTER: [number, number] = [118, -2.5];
const MAP_SOURCE = "kita-geoapify-overlays";

function styleUrl(dark: boolean): string {
  const key = geoapifyApiKey();
  const style = dark ? "dark-matter" : "osm-bright";
  return `https://maps.geoapify.com/v1/styles/${style}/style.json?apiKey=${encodeURIComponent(key)}`;
}

function primaryColor(): string {
  return themeColor("--primary", "248 70% 50%");
}

function themeColor(tokenName: string, fallback: string): string {
  const token = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
  return `hsl(${token || fallback})`;
}

function addOverlayLayers(map: MapLibreMap): void {
  if (!map.getSource(MAP_SOURCE)) {
    map.addSource(MAP_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  if (!map.getLayer("kita-route-line")) {
    map.addLayer({
      id: "kita-route-line", type: "line", source: MAP_SOURCE,
      filter: ["==", ["get", "kind"], "route"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": primaryColor(), "line-width": 6, "line-opacity": 0.9 },
    });
  }
  if (!map.getLayer("kita-route-points")) {
    map.addLayer({
      id: "kita-route-points", type: "circle", source: MAP_SOURCE,
      filter: ["!", ["==", ["get", "kind"], "route"]],
      paint: {
        "circle-radius": ["match", ["get", "kind"], "user", 8, "place", 10, 8],
        "circle-color": ["match", ["get", "kind"], "user", themeColor("--positive", "145 60% 35%"), "place", themeColor("--negative", "0 70% 50%"), primaryColor()],
        "circle-stroke-color": themeColor("--background", "0 0% 100%"), "circle-stroke-width": 3,
      },
    });
  }
  if (!map.getLayer("kita-route-labels")) {
    map.addLayer({
      id: "kita-route-labels", type: "symbol", source: MAP_SOURCE,
      filter: ["in", ["get", "kind"], ["literal", ["stop", "place"]]],
      layout: { "text-field": ["get", "label"], "text-size": 12, "text-offset": [0, 1.4], "text-anchor": "top", "text-allow-overlap": true },
      paint: { "text-color": themeColor("--foreground", "0 0% 10%"), "text-halo-color": themeColor("--background", "0 0% 100%"), "text-halo-width": 1.5 },
    });
  }
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} jam${minutes ? ` ${minutes} mnt` : ""}` : `${totalMinutes} menit`;
}

function routeCoordinates(result: GeoapifyRouteResult): [number, number][] {
  const geometry = result.features[0]?.geometry;
  if (!geometry) return [];
  const raw: number[][] = geometry.type === "LineString"
    ? geometry.coordinates as number[][]
    : (geometry.coordinates as number[][][]).flat();
  return raw.flatMap((point) => point.length >= 2 ? [[Number(point[0]), Number(point[1])] as [number, number]] : []);
}

export function FreeRouteMap({ points, locations, onPlaceSelected }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [searchMode, setSearchMode] = useState<"address" | "place">("address");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoapifyPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<GeoapifyPlace | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [locating, setLocating] = useState(false);
  const [mode, setMode] = useState<GeoapifyTravelMode>("drive");
  const [route, setRoute] = useState<GeoapifyRouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    if (!geoapifyApiKey()) {
      setMapError("Peta Geoapify belum dikonfigurasi. Tambahkan NEXT_PUBLIC_GEOAPIFY_API_KEY di Vercel lalu deploy ulang.");
      return;
    }
    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      const isDark = document.documentElement.dataset.mode === "dark";
      map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl(isDark),
        center: FALLBACK_CENTER,
        zoom: 3,
        attributionControl: false,
        cooperativeGestures: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.on("load", () => {
        if (cancelled || !map) return;
        addOverlayLayers(map);
        setReady(true);
        setMapError("");
      });
      map.on("error", () => {
        if (!cancelled) setMapError("Peta belum dapat dimuat. Periksa koneksi internet dan konfigurasi Geoapify.");
      });
      mapRef.current = map;
    }).catch(() => {
      if (!cancelled) setMapError("Komponen peta gagal dimuat. Muat ulang halaman setelah memeriksa koneksi.");
    });

    let currentDarkStyle = document.documentElement.dataset.mode === "dark";
    const observer = new MutationObserver(() => {
      const current = mapRef.current;
      if (!current) return;
      const dark = document.documentElement.dataset.mode === "dark";
      if (dark !== currentDarkStyle) {
        currentDarkStyle = dark;
        setReady(false);
        current.setStyle(styleUrl(dark));
        current.once("style.load", () => {
          if (cancelled || mapRef.current !== current) return;
          addOverlayLayers(current);
          setReady(true);
        });
      } else {
        const lineLayer = current.getLayer("kita-route-line");
        if (lineLayer) current.setPaintProperty("kita-route-line", "line-color", primaryColor());
        const pointLayer = current.getLayer("kita-route-points");
        if (pointLayer) {
          current.setPaintProperty("kita-route-points", "circle-color", ["match", ["get", "kind"], "user", themeColor("--positive", "145 60% 35%"), "place", themeColor("--negative", "0 70% 50%"), primaryColor()]);
          current.setPaintProperty("kita-route-points", "circle-stroke-color", themeColor("--background", "0 0% 100%"));
        }
        if (current.getLayer("kita-route-labels")) {
          current.setPaintProperty("kita-route-labels", "text-color", themeColor("--foreground", "0 0% 10%"));
          current.setPaintProperty("kita-route-labels", "text-halo-color", themeColor("--background", "0 0% 100%"));
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode", "data-theme", "style"] });

    return () => {
      cancelled = true;
      observer.disconnect();
      searchAbortRef.current?.abort();
      routeAbortRef.current?.abort();
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource(MAP_SOURCE) as GeoJSONSource | undefined;
    if (!ready || !source) return;
    const features: OverlayFeature[] = points.map((point) => ({
      type: "Feature", properties: { kind: "stop", label: `${point.order}. ${point.title}` },
      geometry: { type: "Point", coordinates: [point.lon, point.lat] },
    }));
    if (userLocation) features.push({
      type: "Feature", properties: { kind: "user", label: "Lokasi saya" },
      geometry: { type: "Point", coordinates: [userLocation.longitude, userLocation.latitude] },
    });
    if (selectedPlace) features.push({
      type: "Feature", properties: { kind: "place", label: selectedPlace.name },
      geometry: { type: "Point", coordinates: [selectedPlace.longitude, selectedPlace.latitude] },
    });
    const routeFeature = route?.features[0];
    if (routeFeature) features.push({
      type: "Feature",
      properties: { ...routeFeature.properties, kind: "route" },
      geometry: routeFeature.geometry as OverlayGeometry,
    });
    source.setData({ type: "FeatureCollection", features } as Parameters<GeoJSONSource["setData"]>[0]);
    const primary = primaryColor();
    if (mapRef.current?.getLayer("kita-route-line")) mapRef.current.setPaintProperty("kita-route-line", "line-color", primary);
    if (mapRef.current?.getLayer("kita-route-points")) mapRef.current.setPaintProperty("kita-route-points", "circle-color", ["match", ["get", "kind"], "user", themeColor("--positive", "145 60% 35%"), "place", themeColor("--negative", "0 70% 50%"), primary]);
  }, [points, ready, route, selectedPlace, userLocation]);

  useEffect(() => {
    const text = query.trim();
    searchAbortRef.current?.abort();
    if (text.length < 3) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError("");
      const mapCenter = mapRef.current?.getCenter();
      const center = mapCenter
        ? { latitude: mapCenter.lat, longitude: mapCenter.lng }
        : userLocation ?? { latitude: -6.2, longitude: 106.8 };
      const request = searchMode === "address" ? searchAddresses(text, controller.signal) : searchPlaces(text, center, controller.signal);
      void request.then(setResults).catch((error: unknown) => {
        if (!controller.signal.aborted) setSearchError(friendlyGeoapifyError(error));
      }).finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, searchMode, userLocation]);

  useEffect(() => () => {
    searchAbortRef.current?.abort();
    routeAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!ready || !points.length || route || selectedPlace) return;
    const map = mapRef.current;
    if (!map) return;
    if (points.length === 1) map.flyTo({ center: [points[0].lon, points[0].lat], zoom: 13, duration: 700 });
    else {
      void import("maplibre-gl").then((maplibregl) => {
        if (mapRef.current !== map) return;
        const bounds = points.reduce(
          (result, point) => result.extend([point.lon, point.lat]),
          new maplibregl.LngLatBounds([points[0].lon, points[0].lat], [points[0].lon, points[0].lat]),
        );
        map.fitBounds(bounds, { padding: 44, maxZoom: 13, duration: 700 });
      });
    }
  }, [points, ready, route, selectedPlace]);

  const choosePlace = useCallback((place: GeoapifyPlace) => {
    setSelectedPlace(place);
    setRoute(null);
    setRouteError("");
    setResults([]);
    setQuery(place.name);
    mapRef.current?.flyTo({ center: [place.longitude, place.latitude], zoom: 15, duration: 850 });
    onPlaceSelected?.(place);
  }, [onPlaceSelected]);

  function locateMe(): void {
    setLocationError("");
    if (!navigator.geolocation) { setLocationError("Browser ini tidak mendukung lokasi perangkat."); return; }
    if (!window.isSecureContext) { setLocationError("Lokasi perangkat memerlukan koneksi aman (HTTPS)."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const location = { latitude: coords.latitude, longitude: coords.longitude };
      setUserLocation(location);
      mapRef.current?.flyTo({ center: [location.longitude, location.latitude], zoom: 15, duration: 850 });
      setLocating(false);
    }, (reason) => {
      setLocationError(reason.code === reason.PERMISSION_DENIED
        ? "Izin lokasi ditolak. Aktifkan izin lokasi KITA di pengaturan browser."
        : reason.code === reason.TIMEOUT ? "Pencarian lokasi terlalu lama. Coba lagi." : "Lokasi belum tersedia. Periksa pengaturan GPS perangkat.");
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  async function showDirections(): Promise<void> {
    setRouteError("");
    if (!selectedPlace) { setRouteError("Cari lalu pilih tempat tujuan terlebih dahulu."); return; }
    const firstStop = points[0];
    const origin = userLocation ?? (firstStop ? { latitude: firstStop.lat, longitude: firstStop.lon } : null);
    if (!origin) { setRouteError("Pilih Lokasi saya atau tambahkan titik rencana sebagai titik awal."); return; }
    routeAbortRef.current?.abort();
    const controller = new AbortController();
    routeAbortRef.current = controller;
    setRouting(true);
    try {
      const waypoints = [
        origin,
        ...points.slice(userLocation ? 0 : 1).map((point) => ({ latitude: point.lat, longitude: point.lon })),
        { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
      ];
      const result = await fetchRoute(waypoints, mode, controller.signal);
      if (controller.signal.aborted) return;
      setRoute(result);
      const coordinates = routeCoordinates(result);
      if (coordinates.length) {
        void import("maplibre-gl").then((maplibregl) => {
          const map = mapRef.current;
          if (!map || controller.signal.aborted) return;
          const bounds = coordinates.reduce(
            (value, coordinate) => value.extend(coordinate),
            new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
          );
          map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 850 });
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) setRouteError(friendlyGeoapifyError(error));
    } finally {
      if (!controller.signal.aborted) setRouting(false);
    }
  }

  const routeProperties = route?.features[0]?.properties;
  const instructions = routeProperties?.legs?.flatMap((leg) => leg.steps ?? []).filter((step) => step.instruction?.text || step.name) ?? [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="min-w-0"><CardTitle>Peta & rute</CardTitle><p className="mt-1 text-xs text-muted-foreground">{locations.length} tujuan tersimpan · peta interaktif Geoapify</p></div>
        <Button type="button" variant="outline" size="sm" onClick={locateMe} disabled={locating} className="shrink-0">
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}<span className="hidden sm:inline">Lokasi saya</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative z-20 space-y-2">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={searchMode === "address" ? "default" : "outline"} onClick={() => setSearchMode("address")}>Alamat</Button>
            <Button type="button" size="sm" variant={searchMode === "place" ? "default" : "outline"} onClick={() => setSearchMode("place")}>Tempat</Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedPlace(null); setRoute(null); setRouteError(""); }} placeholder={searchMode === "address" ? "Cari alamat atau lokasi…" : "Cari tempat di sekitar peta…"} className="pl-9 pr-10" aria-label="Cari alamat atau tempat" autoComplete="off" />
            {query ? <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Hapus pencarian" onClick={() => { setQuery(""); setSelectedPlace(null); setRoute(null); }}><X className="h-4 w-4" /></button> : null}
            {query.trim().length >= 3 ? <div className="absolute inset-x-0 top-full mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
              {searching ? <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Mencari…</p>
                : searchError ? <p role="alert" className="px-3 py-3 text-sm text-negative">{searchError}</p>
                  : results.length ? results.map((place) => <button type="button" key={place.id} onClick={() => choosePlace(place)} className="flex w-full items-start gap-2 border-b border-border px-3 py-3 text-left last:border-0 hover:bg-muted">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{place.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{place.address}</span></span>
                  </button>)
                    : <p className="px-3 py-3 text-sm text-muted-foreground">Tidak ada hasil. Coba kata kunci atau jenis pencarian lain.</p>}
            </div> : null}
          </div>
          {searchMode === "place" ? <p className="text-[11px] text-muted-foreground">Pencarian tempat di sekitar pusat peta (radius 20 km).</p> : null}
        </div>

        <div className="relative isolate">
          <div ref={containerRef} className="h-[330px] w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-[430px]" />
          {!ready && !mapError ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-background/75 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memuat peta…</div> : null}
          {mapError ? <div role="alert" className="absolute inset-0 flex items-center justify-center rounded-xl border border-border bg-background/95 px-5 text-center text-sm text-negative">{mapError}</div> : null}
          <Button type="button" variant="outline" size="icon" aria-label="Lokasi saya" className="absolute right-2 top-2 z-10 bg-background/95 shadow-md" onClick={locateMe} disabled={locating}>{locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}</Button>
          {locationError ? <p role="alert" className="absolute bottom-2 left-2 z-10 max-w-[85%] rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-md">{locationError}</p> : null}
        </div>

        {selectedPlace ? <div className="grid gap-3 rounded-xl border border-border bg-muted/35 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{selectedPlace.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{selectedPlace.address}</p>
            {selectedPlace.categories.length ? <p className="mt-1 text-xs text-muted-foreground">{selectedPlace.categories.slice(0, 3).join(" · ")}</p> : null}
            <p className="mt-1 break-all text-[11px] text-muted-foreground">{selectedPlace.latitude.toFixed(6)}, {selectedPlace.longitude.toFixed(6)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Tutup detail tempat" onClick={() => { setSelectedPlace(null); setRoute(null); }}><X className="h-4 w-4" /></Button>
        </div> : null}

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Select aria-label="Moda perjalanan" value={mode} onChange={(event) => { setMode(event.target.value as GeoapifyTravelMode); setRoute(null); }}>
            <option value="drive">Mobil</option><option value="motorcycle">Motor</option><option value="walk">Jalan kaki</option><option value="bicycle">Sepeda</option>
          </Select>
          <Button type="button" className="w-full sm:w-auto" onClick={() => void showDirections()} disabled={!selectedPlace || routing}>
            {routing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}Directions
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Titik awal: {userLocation ? "Lokasi saya" : points[0] ? points[0].title : "gunakan Lokasi saya atau tambahkan rencana"}.</p>
        {routeError ? <p role="alert" className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{routeError}</p> : null}
        {routeProperties ? <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium"><span className="inline-flex items-center gap-1.5"><Navigation className="h-4 w-4 text-primary" />{formatDistance(Number(routeProperties.distance ?? 0))}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-primary" />{formatDuration(Number(routeProperties.time ?? 0))}</span><span className="inline-flex items-center gap-1.5 text-muted-foreground">{mode === "drive" ? <CarFront className="h-4 w-4" /> : mode === "motorcycle" ? <CarFront className="h-4 w-4" /> : mode === "bicycle" ? <Bike className="h-4 w-4" /> : <Footprints className="h-4 w-4" />}{mode === "drive" ? "Mobil" : mode === "motorcycle" ? "Motor" : mode === "bicycle" ? "Sepeda" : "Jalan kaki"}</span></div>
          {instructions.length ? <ol className="max-h-52 space-y-2 overflow-y-auto border-t border-border pt-2 text-sm sm:max-h-64">{instructions.map((step, index) => <li key={`${index}-${step.name ?? "step"}`} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px]">{index + 1}</span><span className="min-w-0">{step.instruction?.text || step.name}{Number.isFinite(step.distance) && Number(step.distance) > 0 ? <span className="ml-1 text-xs text-muted-foreground">· {formatDistance(Number(step.distance))}</span> : null}</span></li>)}</ol> : <p className="border-t border-border pt-2 text-xs text-muted-foreground">Petunjuk belokan tidak tersedia untuk rute ini.</p>}
        </div> : null}
        {!selectedPlace && !points.length ? <p className="text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3.5 w-3.5" />Cari alamat atau tempat untuk menandai peta dan melihat detail.</p> : null}
      </CardContent>
    </Card>
  );
}
