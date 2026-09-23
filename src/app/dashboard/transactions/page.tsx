import { TransactionsClient } from "@/components/views/transactions-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { Account, Category, TransactionWithRelations } from "@/lib/types";

type BudgetPost = { id: string; account_id: string | null; category_id: string; category: { id: string; name: string } | null };

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
      .is("archived_at", null)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("accounts").select("id, name, owner").eq("is_active", true).order("name"),
    supabase.from("categories").select("id, name, kind, color").order("name"),
    supabase.from("account_allocations").select("id, account_id, category_id"),
  ]);

  const filteredTxs = (transactions ?? []).filter((t) => {
    if (currentView === "bersama") return true;
    return t.owner === currentView || t.owner === "shared";
  }) as unknown as TransactionWithRelations[];
  const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const budgetPosts: BudgetPost[] = (budgets ?? []).map((budget) => ({
    id: budget.id,
    account_id: budget.account_id,
    category_id: budget.category_id,
    category: categoryNames.has(budget.category_id)
      ? { id: budget.category_id, name: categoryNames.get(budget.category_id)! }
      : null,
  }));

  return (
    <TransactionsClient
      transactions={filteredTxs}
      accounts={(accounts ?? []) as Pick<Account, "id" | "name" | "owner">[]}
      categories={(categories ?? []) as Pick<Category, "id" | "name" | "kind" | "color">[]}
      budgets={budgetPosts}
    />
  );
}
