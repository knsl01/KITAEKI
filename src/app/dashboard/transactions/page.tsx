import { TransactionsClient } from "@/components/views/transactions-client";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, TransactionWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transaksi — KITA" };

export default async function TransactionsPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: accounts }, { data: categories }] = await Promise.all([
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
  ]);

  return (
    <TransactionsClient
      transactions={(transactions ?? []) as unknown as TransactionWithRelations[]}
      accounts={(accounts ?? []) as Pick<Account, "id" | "name">[]}
      categories={(categories ?? []) as Pick<Category, "id" | "name" | "kind" | "color">[]}
    />
  );
}
