import { AccountsClient } from "@/components/views/accounts-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Akun & Saldo — KITA" };

export default async function AccountsPage() {
  const currentView = await getView();
  const supabase = await createClient();
  const { data } = await supabase.from("accounts").select("*").order("created_at");

  const rawData = (data ?? []) as Account[];
  const filteredData = rawData.filter((a) => currentView === "bersama" || a.owner === currentView || a.owner === "shared");

  return <AccountsClient accounts={filteredData} />;
}
