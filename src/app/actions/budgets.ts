"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

export async function upsertBudget(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const category_id = str(formData, "category_id");
  const amount = num(formData, "amount");
  const month = str(formData, "period_month"); // "YYYY-MM"

  if (!category_id) return fail("Pilih kategori.");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Nominal anggaran harus lebih dari 0.");
  if (!/^\d{4}-\d{2}$/.test(month)) return fail("Periode tidak valid.");

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, household_id: householdId, category_id, amount, period_month: `${month}-01` },
      { onConflict: "household_id,category_id,period_month" }
    );
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
