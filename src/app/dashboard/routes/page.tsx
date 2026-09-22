import { RoutesClient, type RouteStop } from "@/components/views/routes-client";
import { createClient } from "@/lib/supabase/server";
import { getView, getWorkspace } from "@/lib/workspace";
import { isoDateInZone } from "@/lib/balance-history";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rute & Rencana — KITA" };

export default async function RoutesPage() {
  const supabase = await createClient();
  const [view, workspace] = await Promise.all([getView(), getWorkspace()]);
  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, location, detail, starts_on, starts_at, owner, latitude, longitude, route_order, is_done")
    .not("location", "is", null)
    .order("starts_on")
    .order("starts_at", { ascending: true, nullsFirst: false })
    .order("route_order");

  const stops = ((data ?? []) as RouteStop[]).filter((stop) => view === "bersama" || stop.owner === view || stop.owner === "shared");
  return <RoutesClient stops={stops} defaultOwner={workspace?.memberKey ?? "shared"} today={isoDateInZone(new Date())} />;
}
