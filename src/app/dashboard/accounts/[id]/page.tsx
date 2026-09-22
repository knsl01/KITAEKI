import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import { AccountDetailClient } from "@/components/views/account-detail-client";
import type { Account, TransactionWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: account } = await supabase.from("accounts").select("name").eq("id", id).maybeSingle();
  return { title: `${account?.name ?? "Akun"} — KITA` };
}

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const currentView = await getView();

  const [{ data: account }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("transactions")
      .select("*, category:categories(id, name, color, icon_key), account:accounts!account_id(id, name)")
      .or(`account_id.eq.${id},to_account_id.eq.${id}`)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!account) redirect("/dashboard/accounts");

  const filteredTxs = (transactions ?? []).filter(
    (t: any) => currentView === "bersama" || t.owner === currentView || t.owner === "shared"
  ) as unknown as TransactionWithRelations[];

  return (
    <AccountDetailClient
      account={account as Account}
      transactions={filteredTxs}
    />
  );
}
