import { AccountsClient } from "@/components/views/accounts-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { Account, AccountAllocation, Category } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Akun — KITA" };

export default async function AccountsPage() {
  const currentView = await getView();
  const supabase = await createClient();
  const [{ data }, { data: rawAllocations }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at"),
    supabase.from("account_allocations").select("*").order("created_at"),
    supabase.from("categories").select("id, name, color").eq("kind", "expense"),
  ]);

  const rawData = (data ?? []) as Account[];
  const filteredData = rawData.filter((a) => currentView === "bersama" || a.owner === currentView || a.owner === "shared");
  const accountIds = new Set(filteredData.map((account) => account.id));
  const categoryMap = new Map(((categories ?? []) as Pick<Category, "id" | "name" | "color">[]).map((category) => [category.id, category]));
  const filteredAllocations = ((rawAllocations ?? []) as AccountAllocation[])
    .filter((allocation) => !allocation.account_id || accountIds.has(allocation.account_id))
    .map((allocation) => ({ ...allocation, category: categoryMap.get(allocation.category_id) ?? null }));
  return <AccountsClient accounts={filteredData} allocations={filteredAllocations} />;
}
