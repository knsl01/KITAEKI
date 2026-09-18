"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, str, UNAUTH, type ActionResult } from "./_shared";

export async function createAccount(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const name = str(formData, "name");
  const type = str(formData, "type") || "bank";
  const owner = str(formData, "owner") || "shared";
  const initial_balance = num(formData, "initial_balance");

  if (!name) return fail("Nama akun wajib diisi.");
  if (!Number.isFinite(initial_balance)) return fail("Saldo awal tidak valid.");

  const { error } = await supabase
    .from("accounts")
    .insert({ user_id: user.id, name, type, owner, initial_balance });
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateAccount(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const name = str(formData, "name");
  const type = str(formData, "type") || "bank";
  const owner = str(formData, "owner") || "shared";
  const initial_balance = num(formData, "initial_balance");
  const is_active = str(formData, "is_active") !== "false";

  if (!name) return fail("Nama akun wajib diisi.");
  if (!Number.isFinite(initial_balance)) return fail("Saldo awal tidak valid.");

  const { error } = await supabase
    .from("accounts")
    .update({ name, type, owner, initial_balance, is_active })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .or(`account_id.eq.${id},to_account_id.eq.${id}`);

  if ((count ?? 0) > 0) {
    return fail("Akun masih punya transaksi. Hapus transaksinya dulu atau nonaktifkan akun ini.");
  }

  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
