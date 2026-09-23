import { geoapifyFetch, geoapifyUrl } from "./shared";
import type { GeoapifyCoordinate, GeoapifyRouteResult } from "./types";

export type GeoapifyTravelMode = "drive" | "motorcycle" | "walk" | "bicycle";

export async function fetchRoute(points: GeoapifyCoordinate[], mode: GeoapifyTravelMode, signal?: AbortSignal): Promise<GeoapifyRouteResult> {
  if (points.length < 2) throw new Error("Pilih titik awal dan tujuan untuk membuat rute.");
  const waypoints = points.map((point) => `${point.latitude},${point.longitude}`).join("|");
  const params = new URLSearchParams({ waypoints, mode, format: "geojson", details: "instruction_details", lang: "id", units: "metric" });
  const result = await geoapifyFetch<GeoapifyRouteResult>(geoapifyUrl("/v1/routing", params), signal);
  if (!result.features?.length) throw new Error("Rute tidak ditemukan. Coba pilih lokasi awal atau tujuan lain.");
  return result;
}
