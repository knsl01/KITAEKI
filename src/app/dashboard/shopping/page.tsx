import { ShoppingClient } from "@/components/views/shopping-client";
import { createClient } from "@/lib/supabase/server";
import type { ShoppingItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Belanja — KITA" };

export default async function ShoppingPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("shopping_items").select("*").order("created_at", { ascending: false });

  return <ShoppingClient items={(data ?? []) as ShoppingItem[]} />;
}
