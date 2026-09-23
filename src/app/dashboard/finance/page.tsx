import { FinanceClient } from "@/components/views/finance-client";
import { createClient } from "@/lib/supabase/server";
import { monthKey, monthRange } from "@/lib/format";
import { getView } from "@/lib/workspace";
import type { Account, Category, RecurringTransaction, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Keuangan — KITA" };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const currentView = await getView();
  
  let start = params.start;
  let end = params.end;
  
  if (!start || !end) {
    const month = monthKey();
    const range = monthRange(month);
    start = range.start;
    end = range.end;
  }

  const supabase = await createClient();

  const [
    { data: accounts }, 
    { data: transactions }, 
    { data: upcoming },
    { data: categories },
    { data: allocations },
    { data: budgetSpending }
  ] = await Promise.all([
    supabase.from("accounts").select("*").eq("is_active", true).order("balance", { ascending: false }),
    supabase
      .from("transactions")
      .select("type, amount, owner, occurred_on, category_id")
      .gte("occurred_on", start)
      .lte("occurred_on", end),
    supabase
      .from("recurring_transactions")
      .select("id, description, amount, type, next_run_on, owner")
      .eq("is_active", true)
      .order("next_run_on"),
    supabase.from("categories").select("id, name, color, kind"),
    supabase.from("account_allocations").select("id, account_id, amount"),
    supabase.from("transactions").select("amount, budget_post_id, owner").not("budget_post_id", "is", null)
  ]);

  const rawAccounts = (accounts ?? []) as Account[];
  const rawTxs = (transactions ?? []) as Pick<Transaction, "type" | "amount" | "owner" | "occurred_on" | "category_id">[];
  const rawUpcoming = (upcoming ?? []) as Pick<RecurringTransaction, "id" | "description" | "amount" | "type" | "next_run_on" | "owner">[];

  const accountList = rawAccounts.filter((a) => currentView === "bersama" || a.owner === currentView || a.owner === "shared");
  const txs = rawTxs.filter((t) => currentView === "bersama" || t.owner === currentView || t.owner === "shared");
  const upc = rawUpcoming
    .filter((u) => currentView === "bersama" || u.owner === currentView || u.owner === "shared")
    .slice(0, 6);
  const visibleAccountIds = new Set(accountList.map((account) => account.id));
  const visibleAllocations = (allocations ?? []).filter((allocation) => !allocation.account_id || visibleAccountIds.has(allocation.account_id));
  const spentByPost = new Map<string, number>();
  for (const transaction of budgetSpending ?? []) {
    if (!transaction.budget_post_id || (currentView !== "bersama" && transaction.owner !== currentView && transaction.owner !== "shared")) continue;
    spentByPost.set(transaction.budget_post_id, (spentByPost.get(transaction.budget_post_id) ?? 0) + Number(transaction.amount));
  }
  const totalAllocated = visibleAllocations.reduce((sum, allocation) => sum + Math.max(Number(allocation.amount) - (spentByPost.get(allocation.id) ?? 0), 0), 0);

  return (
    <FinanceClient 
      start={start}
      end={end}
      accounts={accountList}
      transactions={txs}
      upcoming={upc}
      totalAllocated={totalAllocated}
      categories={(categories ?? []) as Pick<Category, "id" | "name" | "color" | "kind">[]}
    />
  );
}
