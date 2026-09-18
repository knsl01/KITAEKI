"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

export async function createSavingsGoal(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const name = str(formData, "name");
  const target_amount = num(formData, "target_amount");
  const current_amount = num(formData, "current_amount");
  const target_date = optionalStr(formData, "target_date");
  const owner = str(formData, "owner") || "shared";

  if (!name) return fail("Nama target wajib diisi.");
  if (!Number.isFinite(target_amount) || target_amount <= 0) return fail("Target dana harus lebih dari 0.");

  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    household_id: householdId,
    name,
    target_amount,
    current_amount: Number.isFinite(current_amount) ? current_amount : 0,
    target_date,
    owner,
  });
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateSavingsGoal(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const name = str(formData, "name");
  const target_amount = num(formData, "target_amount");
  const current_amount = num(formData, "current_amount");
  const target_date = optionalStr(formData, "target_date");
  const owner = str(formData, "owner") || "shared";

  if (!name) return fail("Nama target wajib diisi.");
  if (!Number.isFinite(target_amount) || target_amount <= 0) return fail("Target dana harus lebih dari 0.");

  const { error } = await supabase
    .from("savings_goals")
    .update({
      name,
      target_amount,
      current_amount: Number.isFinite(current_amount) ? current_amount : 0,
      target_date,
      owner,
    })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function addSavingsContribution(id: string, amount: number): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);
  if (!Number.isFinite(amount) || amount === 0) return fail("Nominal tidak valid.");

  const { data: goal, error: readError } = await supabase
    .from("savings_goals")
    .select("current_amount")
    .eq("id", id)
    .eq("household_id", householdId)
    .single();
  if (readError || !goal) return fail("Target tabungan tidak ditemukan.");

  const next = Math.max(0, Number(goal.current_amount) + amount);
  const { error } = await supabase
    .from("savings_goals")
    .update({ current_amount: next })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteSavingsGoal(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase.from("savings_goals").delete().eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
