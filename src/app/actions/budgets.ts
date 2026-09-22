"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

export async function upsertBudget(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const category_id = str(formData, "category_id");
  const account_id = optionalStr(formData, "account_id");
  const posName = optionalStr(formData, "pos_name");
  const amount = num(formData, "amount");
  const month = str(formData, "period_month"); // "YYYY-MM"

  let resolvedCategoryId = category_id;
  if (posName) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("household_id", householdId)
      .eq("kind", "expense")
      .ilike("name", posName)
      .maybeSingle();
    if (existing) {
      resolvedCategoryId = existing.id;
    } else {
      const { data: created, error: categoryError } = await supabase
        .from("categories")
        .insert({ user_id: user.id, household_id: householdId, name: posName, kind: "expense", color: "#6D4CC6" })
        .select("id")
        .single();
      if (categoryError || !created) return fail(categoryError?.message ?? "Pos anggaran tidak dapat dibuat.");
      resolvedCategoryId = created.id;
    }
  }

  if (!resolvedCategoryId) return fail("Pilih atau buat nama pos.");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Nominal anggaran harus lebih dari 0.");
  if (!/^\d{4}-\d{2}$/.test(month)) return fail("Periode tidak valid.");

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, household_id: householdId, account_id, category_id: resolvedCategoryId, amount, period_month: `${month}-01` },
      { onConflict: "household_id,account_id,category_id,period_month" }
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
