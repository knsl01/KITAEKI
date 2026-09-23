import { AllocationsOverviewClient } from "@/components/views/allocations-overview-client";
import { createClient } from "@/lib/supabase/server";
import { monthKey, monthRange, monthLabel } from "@/lib/format";
import { getView } from "@/lib/workspace";
import type { Account, AccountAllocation, Category, MemberOwner, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pos Anggaran — KITA" };

export default async function BudgetPage() {
  const month = monthKey();
  const { start, end } = monthRange(month);
  const view = await getView();
  const supabase = await createClient();

  const [{ data: accounts }, { data: allocations }, { data: categories }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("account_allocations").select("*").order("created_at"),
    supabase.from("categories").select("id, name, color").eq("kind", "expense").order("name"),
    supabase.from("transactions").select("amount, category_id, account_id, owner").eq("type", "expense").gte("occurred_on", start).lte("occurred_on", end),
  ]);

  const allAccounts = (accounts ?? []) as Account[];
  const accountMap = new Map(allAccounts.map((account) => [account.id, account]));
  const categoryList = (categories ?? []) as Pick<Category, "id" | "name" | "color">[];
  const categoryMap = new Map(categoryList.map((category) => [category.id, category]));
  const allocationList = ((allocations ?? []) as AccountAllocation[]).map((allocation) => ({
    ...allocation,
    category: categoryMap.get(allocation.category_id) ?? null,
    account: allocation.account_id ? accountMap.get(allocation.account_id) ?? null : null,
  }));
  const visibleTransactions = ((transactions ?? []) as Pick<Transaction, "amount" | "category_id" | "account_id" | "owner">[])
    .filter((transaction) => view === "bersama" || transaction.owner === view || transaction.owner === "shared");

  return <AllocationsOverviewClient
    accounts={allAccounts}
    allocations={allocationList}
    categories={categoryList}
    transactions={visibleTransactions}
    view={view as MemberOwner | "bersama"}
    monthLabelText={monthLabel(month)}
  />;
}
