import { SavingsClient } from "@/components/views/savings-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { SavingsGoal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tabungan & Target — KITA" };

export default async function SavingsPage() {
  const currentView = await getView();
  const supabase = await createClient();
  const { data } = await supabase.from("savings_goals").select("*").order("created_at");

  const rawData = (data ?? []) as SavingsGoal[];
  const filteredData = rawData.filter((t) => currentView === "bersama" || t.owner === currentView || t.owner === "shared");

  return <SavingsClient goals={filteredData} />;
}
