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
    { data: categories }
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
    supabase.from("categories").select("id, name, color, kind")
  ]);

  const rawAccounts = (accounts ?? []) as Account[];
  const rawTxs = (transactions ?? []) as Pick<Transaction, "type" | "amount" | "owner" | "occurred_on" | "category_id">[];
  const rawUpcoming = (upcoming ?? []) as Pick<RecurringTransaction, "id" | "description" | "amount" | "type" | "next_run_on" | "owner">[];

  const accountList = rawAccounts.filter((a) => currentView === "bersama" || a.owner === currentView || a.owner === "shared");
  const txs = rawTxs.filter((t) => currentView === "bersama" || t.owner === currentView || t.owner === "shared");
  const upc = rawUpcoming
    .filter((u) => currentView === "bersama" || u.owner === currentView || u.owner === "shared")
    .slice(0, 6);

  return (
    <FinanceClient 
      start={start}
      end={end}
      accounts={accountList}
      transactions={txs}
      upcoming={upc}
      categories={(categories ?? []) as Pick<Category, "id" | "name" | "color" | "kind">[]}
    />
  );
}
