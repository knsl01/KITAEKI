import { TransactionsClient } from "@/components/views/transactions-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { Account, Category, TransactionWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transaksi — KITA" };

export default async function TransactionsPage() {
  const supabase = await createClient();
  const currentView = await getView();

  const [{ data: transactions }, { data: accounts }, { data: categories }, { data: budgets }] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "*, account:accounts!transactions_account_id_fkey(id, name), to_account:accounts!transactions_to_account_id_fkey(id, name), category:categories(id, name, color, kind)"
      )
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("accounts").select("id, name").order("name"),
    supabase.from("categories").select("id, name, kind, color").order("name"),
    supabase
      .from("budgets")
      .select("id, category_id, category:categories(id, name)")
      .eq("period_month", `${new Date().toISOString().slice(0, 7)}-01`),
  ]);

  const filteredTxs = (transactions ?? []).filter((t) => {
    if (currentView === "bersama") return true;
    return t.owner === currentView || t.owner === "shared";
  }) as unknown as TransactionWithRelations[];

  return (
    <TransactionsClient
      transactions={filteredTxs}
      accounts={(accounts ?? []) as Pick<Account, "id" | "name">[]}
      categories={(categories ?? []) as Pick<Category, "id" | "name" | "kind" | "color">[]}
      budgets={(budgets ?? []) as { id: string; category_id: string; category?: { id: string; name: string } | null }[]}
    />
  );
}
