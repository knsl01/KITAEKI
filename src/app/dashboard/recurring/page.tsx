import { RecurringClient } from "@/components/views/recurring-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { Account, Category, RecurringTransaction } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transaksi berulang — KITA" };

export default async function RecurringPage() {
  const currentView = await getView();
  const supabase = await createClient();

  const [{ data: items }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from("recurring_transactions")
      .select("*, account:accounts!recurring_transactions_account_id_fkey(id, name), category:categories(id, name, color)")
      .order("next_run_on"),
    supabase.from("accounts").select("id, name").order("name"),
    supabase.from("categories").select("id, name, kind").order("name"),
  ]);

  const rawItems = (items ?? []) as unknown as RecurringTransaction[];
  const filteredItems = rawItems.filter((t) => currentView === "bersama" || t.owner === currentView || t.owner === "shared");

  return (
    <RecurringClient
      items={filteredItems}
      accounts={(accounts ?? []) as Pick<Account, "id" | "name">[]}
      categories={(categories ?? []) as Pick<Category, "id" | "name" | "kind">[]}
    />
  );
}
