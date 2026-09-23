import { geoapifyFetch, geoapifyUrl } from "./shared";
import type { GeoapifyPlace } from "./types";

type GeocodingResponse = {
  results?: Array<{
    place_id?: string;
    name?: string;
    formatted?: string;
    address_line1?: string;
    address_line2?: string;
    result_type?: string;
    lat?: number;
    lon?: number;
    categories?: string[];
  }>;
};

function normalize(results: NonNullable<GeocodingResponse["results"]>): GeoapifyPlace[] {
  return results.flatMap((item, index) => {
    const latitude = Number(item.lat), longitude = Number(item.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const address = item.formatted || [item.address_line1, item.address_line2].filter(Boolean).join(", ");
    return [{
      id: item.place_id || `${latitude}:${longitude}:${index}`,
      name: item.name || item.address_line1 || address || "Lokasi tanpa nama",
      address: address || "Alamat tidak tersedia",
      categories: item.categories ?? (item.result_type ? [item.result_type] : []),
      latitude,
      longitude,
    }];
  });
}

export async function searchAddresses(query: string, signal?: AbortSignal): Promise<GeoapifyPlace[]> {
  const params = new URLSearchParams({ text: query.trim(), lang: "id", limit: "6", format: "json" });
  const response = await geoapifyFetch<GeocodingResponse>(geoapifyUrl("/v1/geocode/autocomplete", params), signal);
  return normalize(response.results ?? []);
}

export async function geocodeAddress(query: string): Promise<{ latitude: number; longitude: number } | null> {
  if (query.trim().length < 3) return null;
  const results = await searchAddresses(query);
  return results[0] ? { latitude: results[0].latitude, longitude: results[0].longitude } : null;
}
