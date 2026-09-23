import { notFound } from "next/navigation";
import { AccountPositionsClient } from "@/components/views/account-positions-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { Account, AccountAllocation, Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountPositionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentView = await getView();
  const supabase = await createClient();
  const [{ data: rawAccount }, { data: rawAllocations }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", id).maybeSingle(),
    supabase.from("account_allocations").select("*").eq("account_id", id).order("created_at"),
    supabase.from("categories").select("id, name, color").eq("kind", "expense"),
  ]);

  if (!rawAccount) notFound();
  const account = rawAccount as Account;
  if (currentView !== "bersama" && account.owner !== currentView && account.owner !== "shared") notFound();

  const categoryMap = new Map(((categories ?? []) as Pick<Category, "id" | "name" | "color">[]).map((category) => [category.id, category]));
  const allocations = ((rawAllocations ?? []) as AccountAllocation[])
    .map((allocation) => ({ ...allocation, category: categoryMap.get(allocation.category_id) ?? null }));
  return <AccountPositionsClient account={account} allocations={allocations} />;
}
