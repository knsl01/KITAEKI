export function geoapifyApiKey(): string {
  return process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY?.trim() ?? "";
}

export function geoapifyUrl(path: string, params: URLSearchParams): string {
  const key = geoapifyApiKey();
  if (!key) throw new Error("Geoapify belum dikonfigurasi. Tambahkan NEXT_PUBLIC_GEOAPIFY_API_KEY di Vercel lalu deploy ulang.");
  params.set("apiKey", key);
  return `https://api.geoapify.com${path}?${params.toString()}`;
}

export async function geoapifyFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("Kunci Geoapify tidak valid atau kuota layanan tidak tersedia.");
    if (response.status === 429) throw new Error("Batas permintaan peta tercapai. Coba lagi sebentar.");
    throw new Error("Layanan peta sedang bermasalah. Coba lagi nanti.");
  }
  return response.json() as Promise<T>;
}

export function friendlyGeoapifyError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "";
  if (error instanceof TypeError) return "Koneksi ke layanan peta gagal. Periksa internet lalu coba lagi.";
  return error instanceof Error ? error.message : "Pencarian peta gagal. Silakan coba lagi.";
}
