import { BudgetClient } from "@/components/views/budget-client";
import { createClient } from "@/lib/supabase/server";
import { monthKey, monthRange } from "@/lib/format";
import { getView } from "@/lib/workspace";
import type { Budget, Category, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alokasi — KITA" };

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : monthKey();
  const { start, end } = monthRange(month);

  const currentView = await getView();
  const supabase = await createClient();

  const [{ data: budgets }, { data: categories }, { data: transactions }] = await Promise.all([
    supabase.from("budgets").select("*, category:categories(id, name, color)").eq("period_month", start),
    supabase.from("categories").select("*").eq("kind", "expense").order("name"),
    supabase
      .from("transactions")
      .select("amount, type, category_id, owner")
      .eq("type", "expense")
      .gte("occurred_on", start)
      .lte("occurred_on", end),
  ]);

  const rawTxs = (transactions ?? []) as Pick<Transaction, "amount" | "type" | "category_id" | "owner">[];
  const txs = rawTxs.filter((t) => currentView === "bersama" || t.owner === currentView || t.owner === "shared");

  return (
    <BudgetClient
      month={month}
      budgets={(budgets ?? []) as unknown as Budget[]}
      categories={(categories ?? []) as Category[]}
      transactions={txs}
    />
  );
}
