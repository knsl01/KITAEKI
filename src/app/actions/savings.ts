"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";
import { pushActivity, rupiah } from "@/lib/push";

export async function createSavingsGoal(formData: FormData): Promise<ActionResult> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const name = str(formData, "name");
  const target_amount = num(formData, "target_amount");
  const current_amount = num(formData, "current_amount");
  const target_date = optionalStr(formData, "target_date");
  const owner = str(formData, "owner") || "shared";
  const image_url = optionalStr(formData, "image_url");
  const item_url = optionalStr(formData, "item_url");

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
    image_url,
    item_url,
  });
  if (error) return fail(error.message);

  await pushActivity(session, ({ who }) => ({
    title: "🎯 Target tabungan baru",
    body: `${who} membuat target “${name}” senilai ${rupiah(target_amount)}`,
    url: "/dashboard/savings",
  }));

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
  const image_url = optionalStr(formData, "image_url");
  const item_url = optionalStr(formData, "item_url");

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
      image_url,
      item_url,
    })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function addSavingsContribution(id: string, amount: number): Promise<ActionResult> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);
  if (!Number.isFinite(amount) || amount === 0) return fail("Nominal tidak valid.");

  const { data: goal, error: readError } = await supabase
    .from("savings_goals")
    .select("name, current_amount, target_amount")
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

  const targetAmount = Number(goal.target_amount) || 0;
  const wasReached = targetAmount > 0 && Number(goal.current_amount) >= targetAmount;
  const nowReached = targetAmount > 0 && next >= targetAmount;
  const pct = targetAmount > 0 ? Math.min(100, Math.round((next / targetAmount) * 100)) : 0;
  await pushActivity(session, ({ who }) =>
    nowReached && !wasReached
      ? { title: "🎉 Target tercapai!", body: `“${goal.name}” sudah terkumpul ${rupiah(next)}. Selamat, ${who} & pasangan!`, url: "/dashboard/savings" }
      : amount > 0
        ? { title: "🐷 Tabungan bertambah", body: `${who} menabung ${rupiah(amount)} untuk “${goal.name}” (${pct}%)`, url: "/dashboard/savings" }
        : null
  );

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
