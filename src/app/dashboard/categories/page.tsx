import { CategoriesClient } from "@/components/views/categories-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kategori — KITA" };

export default async function CategoriesPage() {
  const currentView = await getView(); // Added per instruction
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("kind").order("name");

  return <CategoriesClient categories={(data ?? []) as Category[]} />;
}
