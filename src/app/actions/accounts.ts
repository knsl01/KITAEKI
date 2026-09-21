"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

export async function createAccount(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const name = str(formData, "name");
  const type = str(formData, "type") || "bank";
  const owner = str(formData, "owner") || "shared";
  const initial_balance = num(formData, "initial_balance");
  const icon_key = optionalStr(formData, "icon_key");

  if (!name) return fail("Nama akun wajib diisi.");
  if (!Number.isFinite(initial_balance)) return fail("Saldo awal tidak valid.");

  const { error } = await supabase
    .from("accounts")
    .insert({ user_id: user.id, household_id: householdId, name, type, owner, initial_balance, icon_key });
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateAccount(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const name = str(formData, "name");
  const type = str(formData, "type") || "bank";
  const owner = str(formData, "owner") || "shared";
  const initial_balance = num(formData, "initial_balance");
  const icon_key = optionalStr(formData, "icon_key");
  const is_active = str(formData, "is_active") !== "false";

  if (!name) return fail("Nama akun wajib diisi.");
  if (!Number.isFinite(initial_balance)) return fail("Saldo awal tidak valid.");

  const { error } = await supabase
    .from("accounts")
    .update({ name, type, owner, initial_balance, is_active, icon_key })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .or(`account_id.eq.${id},to_account_id.eq.${id}`);

  if ((count ?? 0) > 0) {
    return fail("Akun masih punya transaksi. Hapus transaksinya dulu atau nonaktifkan akun ini.");
  }

  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
