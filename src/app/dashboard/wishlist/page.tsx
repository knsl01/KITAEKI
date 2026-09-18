import { WishlistClient } from "@/components/views/wishlist-client";
import { createClient } from "@/lib/supabase/server";
import type { WishlistItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlist — KITA" };

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("wishlist_items").select("*").order("created_at", { ascending: false });

  return <WishlistClient items={(data ?? []) as WishlistItem[]} />;
}
