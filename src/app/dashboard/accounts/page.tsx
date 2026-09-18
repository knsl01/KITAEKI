import { AccountsClient } from "@/components/views/accounts-client";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Akun & Saldo — KITA" };

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("accounts").select("*").order("created_at");

  return <AccountsClient accounts={(data ?? []) as Account[]} />;
}
