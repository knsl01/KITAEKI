import { RecurringClient } from "@/components/views/recurring-client";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, RecurringTransaction } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transaksi berulang — KITA" };

export default async function RecurringPage() {
  const supabase = await createClient();

  const [{ data: items }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from("recurring_transactions")
      .select("*, account:accounts!recurring_transactions_account_id_fkey(id, name), category:categories(id, name, color)")
      .order("next_run_on"),
    supabase.from("accounts").select("id, name").order("name"),
    supabase.from("categories").select("id, name, kind").order("name"),
  ]);

  return (
    <RecurringClient
      items={(items ?? []) as unknown as RecurringTransaction[]}
      accounts={(accounts ?? []) as Pick<Account, "id" | "name">[]}
      categories={(categories ?? []) as Pick<Category, "id" | "name" | "kind">[]}
    />
  );
}
