import { SavingsClient } from "@/components/views/savings-client";
import { createClient } from "@/lib/supabase/server";
import type { SavingsGoal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tabungan & Target — KITA" };

export default async function SavingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("savings_goals").select("*").order("created_at");

  return <SavingsClient goals={(data ?? []) as SavingsGoal[]} />;
}
