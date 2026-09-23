import { NudgeClient } from "@/components/views/nudge-client";
import { createClient } from "@/lib/supabase/server";
import { getView, getWorkspace } from "@/lib/workspace";
import { addDays, isoDateInZone } from "@/lib/balance-history";
import { generateNudges } from "@/lib/nudge/engine";
import type { NudgeData } from "@/lib/nudge/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nudge — KITA" };

function matchesView(owner: string, view: string): boolean {
  return view === "bersama" || owner === view || owner === "shared";
}

export default async function NudgePage() {
  const [workspace, view] = await Promise.all([getWorkspace(), getView()]);
  if (!workspace?.householdId) return <NudgeClient nudges={[]} householdId="none" errorMessage="Workspace belum tersedia." />;

  const supabase = await createClient();
  const today = isoDateInZone(new Date());
  const [accountsResult, transactionsResult, categoriesResult, recurringResult, goalsResult, allocationsResult, shoppingResult, plannerResult] = await Promise.all([
    supabase.from("accounts").select("id, name, balance, owner").eq("is_active", true),
    supabase.from("transactions").select("id, type, amount, occurred_on, description, category_id, owner").is("archived_at", null).gte("occurred_on", addDays(today, -34)),
    supabase.from("categories").select("id, name"),
    supabase.from("recurring_transactions").select("id, description, amount, account_id, next_run_on, is_active, type, owner").eq("is_active", true),
    supabase.from("savings_goals").select("id, name, target_amount, current_amount, target_date, owner").eq("is_archived", false),
    supabase.from("account_allocations").select("id, account_id, target_amount, allocated_amount, updated_at"),
    supabase.from("shopping_items").select("id, name, estimated_price, is_bought, assigned_to"),
    supabase.from("tasks").select("id, title, due_on, is_done, assigned_to").eq("is_done", false).gte("due_on", today).lte("due_on", addDays(today, 3)),
  ]);

  const errors = [accountsResult, transactionsResult, categoriesResult, recurringResult, goalsResult, allocationsResult, shoppingResult, plannerResult]
    .filter((result) => result.error);
  if (errors.length) {
    return <NudgeClient nudges={[]} householdId={workspace.householdId} errorMessage="Sebagian data KITA belum bisa dimuat. Coba segarkan lagi." />;
  }

  const accounts = (accountsResult.data ?? []).filter((item) => matchesView(item.owner, view)).map((item) => ({ ...item, balance: Number(item.balance) }));
  const accountIds = new Set(accounts.map((account) => account.id));
  const raw = {
    today,
    accounts,
    transactions: (transactionsResult.data ?? []).filter((item) => matchesView(item.owner, view)).map((item) => ({ ...item, amount: Number(item.amount) })),
    categories: categoriesResult.data ?? [],
    recurring: (recurringResult.data ?? []).filter((item) => matchesView(item.owner, view)).map((item) => ({ ...item, amount: Number(item.amount) })),
    goals: (goalsResult.data ?? []).filter((item) => matchesView(item.owner, view)).map((item) => ({ ...item, target_amount: Number(item.target_amount), current_amount: Number(item.current_amount) })),
    allocations: (allocationsResult.data ?? []).filter((item) => item.account_id && accountIds.has(item.account_id)).map((item) => ({ ...item, target_amount: Number(item.target_amount), allocated_amount: Number(item.allocated_amount) })),
    shopping: (shoppingResult.data ?? []).filter((item) => matchesView(item.assigned_to, view)).map((item) => ({ ...item, estimated_price: item.estimated_price === null ? null : Number(item.estimated_price) })),
    planner: (plannerResult.data ?? []).filter((item) => matchesView(item.assigned_to, view)),
  } as NudgeData;

  return <NudgeClient nudges={generateNudges(raw)} householdId={workspace.householdId} />;
}
