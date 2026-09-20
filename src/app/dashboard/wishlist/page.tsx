import { WishlistClient } from "@/components/views/wishlist-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { WishlistItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlist — KITA" };

export default async function WishlistPage() {
  const currentView = await getView();
  const supabase = await createClient();
  const { data } = await supabase.from("wishlist_items").select("*").order("created_at", { ascending: false });

  const rawData = (data ?? []) as WishlistItem[];
  const filteredData = rawData.filter((t) => currentView === "bersama" || t.owner === currentView || t.owner === "shared");

  return <WishlistClient items={filteredData} />;
}
