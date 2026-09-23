import { geoapifyFetch, geoapifyUrl } from "./shared";
import type { GeoapifyCoordinate, GeoapifyPlace } from "./types";

type PlacesResponse = {
  features?: Array<{
    id?: string;
    properties?: {
      place_id?: string;
      name?: string;
      formatted?: string;
      address_line1?: string;
      address_line2?: string;
      lat?: number;
      lon?: number;
      categories?: string[];
    };
  }>;
};

export async function searchPlaces(query: string, center: GeoapifyCoordinate, signal?: AbortSignal): Promise<GeoapifyPlace[]> {
  const radius = 20_000;
  const params = new URLSearchParams({
    name: query.trim(),
    categories: "commercial,catering,entertainment,education,healthcare,service",
    filter: `circle:${center.longitude},${center.latitude},${radius}`,
    bias: `proximity:${center.longitude},${center.latitude}`,
    lang: "id",
    limit: "6",
  });
  const response = await geoapifyFetch<PlacesResponse>(geoapifyUrl("/v2/places", params), signal);
  return (response.features ?? []).flatMap((feature, index) => {
    const item = feature.properties;
    if (!item) return [];
    const latitude = Number(item.lat), longitude = Number(item.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const address = item.formatted || [item.address_line1, item.address_line2].filter(Boolean).join(", ");
    return [{
      id: item.place_id || feature.id || `${latitude}:${longitude}:${index}`,
      name: item.name || item.address_line1 || "Tempat tanpa nama",
      address: address || "Alamat tidak tersedia",
      categories: item.categories ?? [],
      latitude,
      longitude,
    }];
  });
}
