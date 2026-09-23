import { AllocationsOverviewClient } from "@/components/views/allocations-overview-client";
import { createClient } from "@/lib/supabase/server";
import { getView, getWorkspace } from "@/lib/workspace";
import type { Account, AccountAllocation, Category } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anggaran — KITA" };

export default async function BudgetPage() {
  const [currentView, workspace] = await Promise.all([getView(), getWorkspace()]);
  const supabase = await createClient();
  const [{ data: rawAccounts }, { data: rawAllocations }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at"),
    supabase.from("account_allocations").select("*").order("created_at"),
    supabase.from("categories").select("id, name, color").eq("kind", "expense"),
  ]);

  const accounts = ((rawAccounts ?? []) as Account[]).filter((account) => currentView === "bersama" || account.owner === currentView || account.owner === "shared");
  const accountIds = new Set(accounts.map((account) => account.id));
  const categoryMap = new Map(((categories ?? []) as Pick<Category, "id" | "name" | "color">[]).map((category) => [category.id, category]));
  const allocations = ((rawAllocations ?? []) as AccountAllocation[])
    .filter((allocation) => !allocation.account_id || accountIds.has(allocation.account_id))
    .map((allocation) => ({ ...allocation, category: categoryMap.get(allocation.category_id) ?? null }));
  const ownerLabels = {
    eki: workspace?.member1Name || "Eki",
    dinda: workspace?.member2Name || "Dinda",
    shared: "Bersama",
  };

  return <AllocationsOverviewClient accounts={accounts} allocations={allocations} ownerLabels={ownerLabels} />;
}
