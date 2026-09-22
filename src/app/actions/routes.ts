"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

const OWNERS = ["eki", "dinda", "shared"] as const;
const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function findRouteLocation(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const { user } = await getUserClient();
  if (typeof query !== "string") return null;
  const value = query.trim().slice(0, 240);
  if (!user || value.length < 3) return null;
  try {
    const response = await fetch("https://photon.komoot.io/api/?q=" + encodeURIComponent(value) + "&lang=id&limit=1", {
      headers: { Accept: "application/json", "User-Agent": "KITA-WebApp/1.0 (route planning)" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return null;
    const result = await response.json();
    const pair = result.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(pair) || pair.length !== 2) return null;
    const longitude = Number(pair[0]), latitude = Number(pair[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

export async function createRouteStop(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const title = text(formData, "title");
  const location = text(formData, "location");
  const startsOn = text(formData, "starts_on");
  const startsAt = text(formData, "starts_at");
  const owner = text(formData, "owner");
  const latitudeRaw = text(formData, "latitude");
  const longitudeRaw = text(formData, "longitude");
  const latitude = latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw ? Number(longitudeRaw) : null;

  if (!title || title.length > 120 || !location || location.length > 240 || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) return fail("Isi nama kegiatan, lokasi, dan tanggal rencana dengan benar.");
  if (!OWNERS.includes(owner as (typeof OWNERS)[number])) return fail("Pemilik rencana tidak valid.");
  if (startsAt && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startsAt)) return fail("Format jam tidak valid.");
  if ((latitude !== null || longitude !== null) && (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)) {
    return fail("Koordinat lokasi tidak valid.");
  }

  const { data: lastStop } = await supabase
    .from("calendar_events")
    .select("route_order")
    .eq("household_id", householdId)
    .eq("starts_on", startsOn)
    .order("route_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("calendar_events").insert({
    household_id: householdId,
    created_by: user.id,
    owner,
    title,
    detail: text(formData, "detail").slice(0, 1000) || null,
    starts_on: startsOn,
    starts_at: startsAt || null,
    ends_on: startsOn,
    is_all_day: !startsAt,
    location,
    latitude,
    longitude,
    route_order: Number(lastStop?.route_order ?? -1) + 1,
  });
  if (error) return fail(error.message);

  revalidatePath("/dashboard/routes");
  revalidatePath("/dashboard/calendar");
  return { ok: true };
}

export async function deleteRouteStop(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Rencana tidak valid.");

  const { error } = await supabase.from("calendar_events").delete().eq("id", id).eq("household_id", householdId).not("location", "is", null);
  if (error) return fail(error.message);
  revalidatePath("/dashboard/routes");
  revalidatePath("/dashboard/calendar");
  return { ok: true };
}

export async function toggleRouteStop(id: string, done: boolean): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Rencana tidak valid.");
  const { error } = await supabase.from("calendar_events").update({ is_done: done }).eq("id", id).eq("household_id", householdId).not("location", "is", null);
  if (error) return fail(error.message);
  revalidatePath("/dashboard/routes");
  return { ok: true };
}
