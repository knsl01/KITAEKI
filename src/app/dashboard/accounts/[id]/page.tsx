import { redirect } from "next/navigation";
import { AccountAllocationClient } from "@/components/views/account-allocation-client";
import { monthKey, monthRange, monthLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { Account, AccountAllocation, Category, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: account } = await supabase.from("accounts").select("name").eq("id", id).maybeSingle();
  return { title: `Alokasi ${account?.name ?? "Akun"} — KITA` };
}

export default async function AccountAllocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const month = monthKey();
  const { start, end } = monthRange(month);
  const supabase = await createClient();
  const view = await getView();

  const [{ data: account }, { data: allocations }, { data: categories }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", id).maybeSingle(),
    supabase.from("account_allocations").select("*").eq("account_id", id),
    supabase.from("categories").select("id, name, color").eq("kind", "expense").order("name"),
    supabase.from("transactions").select("amount, category_id, owner").eq("type", "expense").eq("account_id", id).gte("occurred_on", start).lte("occurred_on", end),
  ]);

  if (!account) redirect("/dashboard/accounts");
  const visibleTransactions = (transactions ?? []).filter((transaction) => view === "bersama" || transaction.owner === view || transaction.owner === "shared");
  const categoryMap = new Map((categories ?? []).map((category) => [category.id, category]));
  const accountAllocations = ((allocations ?? []) as AccountAllocation[]).map((allocation) => ({ ...allocation, category: categoryMap.get(allocation.category_id) ?? null }));

  return (
    <AccountAllocationClient
      account={account as Account}
      monthLabelText={monthLabel(month)}
      allocations={accountAllocations}
      categories={(categories ?? []) as Pick<Category, "id" | "name" | "color">[]}
      transactions={visibleTransactions as Pick<Transaction, "amount" | "category_id">[]}
    />
  );
}
