import { AccountsClient } from "@/components/views/accounts-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { Account, AccountAllocation, Category } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Akun — KITA" };

export default async function AccountsPage() {
  const currentView = await getView();
  const supabase = await createClient();
  const [{ data }, { data: rawAllocations }, { data: categories }, { data: spending }] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at"),
    supabase.from("account_allocations").select("*").order("created_at"),
    supabase.from("categories").select("id, name, color").eq("kind", "expense"),
    supabase.from("transactions").select("amount, budget_post_id, owner").not("budget_post_id", "is", null),
  ]);

  const rawData = (data ?? []) as Account[];
  const filteredData = rawData.filter((a) => currentView === "bersama" || a.owner === currentView || a.owner === "shared");
  const accountIds = new Set(filteredData.map((account) => account.id));
  const categoryMap = new Map(((categories ?? []) as Pick<Category, "id" | "name" | "color">[]).map((category) => [category.id, category]));
  const filteredAllocations = ((rawAllocations ?? []) as AccountAllocation[])
    .filter((allocation) => !allocation.account_id || accountIds.has(allocation.account_id))
    .map((allocation) => ({ ...allocation, category: categoryMap.get(allocation.category_id) ?? null }));
  const allocationIds = new Set(filteredAllocations.map((allocation) => allocation.id));
  const spentByPost: Record<string, number> = {};
  for (const transaction of spending ?? []) {
    if (!transaction.budget_post_id || !allocationIds.has(transaction.budget_post_id)) continue;
    if (currentView !== "bersama" && transaction.owner !== currentView && transaction.owner !== "shared") continue;
    spentByPost[transaction.budget_post_id] = (spentByPost[transaction.budget_post_id] ?? 0) + Number(transaction.amount);
  }

  return <AccountsClient accounts={filteredData} allocations={filteredAllocations} spentByPost={spentByPost} />;
}
