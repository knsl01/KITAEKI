"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";
import { pushActivity } from "@/lib/push";

function revalidateAccountViews() {
  for (const path of ["/dashboard", "/dashboard/accounts", "/dashboard/budget", "/dashboard/finance", "/dashboard/transactions", "/dashboard/share"]) {
    revalidatePath(path, path === "/dashboard" ? "layout" : "page");
  }
}

export async function createAccount(formData: FormData): Promise<ActionResult> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
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

  await pushActivity(session, ({ who }) => ({
    title: "🏦 Akun baru",
    body: `${who} menambahkan akun “${name}”`,
    url: "/dashboard/accounts",
  }));

  revalidateAccountViews();
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

  const { data, error } = await supabase
    .from("accounts")
    .update({ name, type, owner, initial_balance, is_active, icon_key })
    .eq("id", id)
    .eq("household_id", householdId)
    .select("id")
    .maybeSingle();
  if (error) return fail(error.message);
  if (!data) return fail("Akun tidak ditemukan atau tidak bisa diubah.");

  revalidateAccountViews();
  return { ok: true };
}

export async function setAccountActive(id: string, isActive: boolean): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Akun tidak valid.");

  const { data, error } = await supabase
    .from("accounts")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("household_id", householdId)
    .select("id")
    .maybeSingle();
  if (error) return fail(error.message);
  if (!data) return fail("Akun tidak ditemukan atau statusnya tidak bisa diubah.");

  revalidateAccountViews();
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Akun tidak valid.");

  const { data: deleted, error } = await supabase.rpc("delete_account_with_history", { p_account_id: id });
  if (error) return fail(`Tidak bisa menghapus akun dan riwayatnya. Pastikan migrasi arsip akun sudah dijalankan. ${error.message}`);
  if (!deleted) return fail("Akun tidak ditemukan atau tidak bisa dihapus.");

  revalidateAccountViews();
  return { ok: true };
}
