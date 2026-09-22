"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type RouteMapPoint = {
  id: string;
  title: string;
  lat: number;
  lon: number;
  order: number;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { title: string; order: number };
    geometry: { type: "Point"; coordinates: [number, number] };
  }>;
};

export function FreeRouteMap({ points, locations }: { points: RouteMapPoint[]; locations: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const routeLink = points.length
    ? "https://www.google.com/maps/dir/" + points.map((point) => point.lat + "," + point.lon).join("/")
    : "https://www.google.com/maps/search/" + encodeURIComponent(locations.join(" "));

  useEffect(() => {
    let cancelled = false;
    let map: any;

    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [118, -2.5],
        zoom: 3,
        attributionControl: false,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.on("load", () => {
        if (cancelled) return;
        map.addSource("kita-route-stops", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "kita-route-stop-markers",
          type: "circle",
          source: "kita-route-stops",
          paint: {
            "circle-radius": 15,
            "circle-color": "#167a4b",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 3,
          },
        });
        map.addLayer({
          id: "kita-route-stop-numbers",
          type: "symbol",
          source: "kita-route-stops",
          layout: {
            "text-field": ["get", "order"],
            "text-size": 13,
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          },
          paint: { "text-color": "#ffffff" },
        });
        setReady(true);
      });
      map.on("error", () => {
        if (!cancelled) setError("Peta belum bisa dimuat. Periksa koneksi internet lalu muat ulang halaman.");
      });
      mapRef.current = map;
    }).catch(() => {
      if (!cancelled) setError("Peta belum bisa dimuat. Periksa koneksi internet lalu muat ulang halaman.");
    });

    return () => {
      cancelled = true;
      setReady(false);
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("kita-route-stops");
    if (!ready || !source) return;

    const features: FeatureCollection["features"] = points.map((point) => ({
      type: "Feature",
      properties: { title: point.title, order: point.order },
      geometry: { type: "Point", coordinates: [point.lon, point.lat] },
    }));
    source.setData({ type: "FeatureCollection", features } satisfies FeatureCollection);

    if (points.length === 1) {
      map.flyTo({ center: [points[0].lon, points[0].lat], zoom: 14, duration: 800 });
    } else if (points.length > 1) {
      void import("maplibre-gl").then((maplibregl) => {
        if (mapRef.current !== map) return;
        const bounds = points.reduce(
          (result, point) => result.extend([point.lon, point.lat]),
          new maplibregl.LngLatBounds([points[0].lon, points[0].lat], [points[0].lon, points[0].lat])
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
      });
    } else {
      map.flyTo({ center: [118, -2.5], zoom: 3, duration: 800 });
    }
  }, [points, ready]);

  function locateMe() {
    setError("");
    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung lokasi perangkat.");
      return;
    }
    if (!window.isSecureContext) {
      setError("Lokasi perangkat hanya tersedia melalui koneksi aman (HTTPS).");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 15, duration: 1000 });
        setLocating(false);
      },
      (reason) => {
        setError(reason.code === reason.PERMISSION_DENIED
          ? "Izin lokasi ditolak. Aktifkan izin lokasi KITA di pengaturan browser."
          : "Lokasi belum ditemukan. Coba lagi dan pastikan GPS aktif.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Peta rute</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{locations.length} tujuan · urutan mengikuti jadwal</p>
        </div>
        {locations.length > 0 ? (
          <Button asChild size="sm" variant="outline">
            <a href={routeLink} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" /> Buka rute</a>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div ref={containerRef} className="h-[300px] w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-[360px]" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Tampilkan lokasi saya"
            className="absolute right-2 top-28 z-10 bg-background/95 shadow-md"
            onClick={locateMe}
            disabled={locating}
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          </Button>
          {!points.length ? (
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-border bg-background/90 px-3 py-2 text-xs shadow-sm">
              <MapPin className="mr-1 inline h-3.5 w-3.5" /> Tambahkan tujuan untuk menampilkan penanda di peta.
            </div>
          ) : null}
          {error ? <p role="alert" className="absolute bottom-7 left-2 z-10 max-w-[75%] rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-md">{error}</p> : null}
        </div>
        {!ready && !error ? <p className="mt-2 text-xs text-muted-foreground">Memuat peta…</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">Peta dan penanda lokasi gratis. Tombol “Buka rute” memakai Google Maps untuk petunjuk jalan.</p>
      </CardContent>
    </Card>
  );
}
