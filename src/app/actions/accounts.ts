"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";
import { pushActivity } from "@/lib/push";

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

  const { data, error } = await supabase
    .from("accounts")
    .update({ name, type, owner, initial_balance, is_active, icon_key })
    .eq("id", id)
    .eq("household_id", householdId)
    .select("id")
    .maybeSingle();
  if (error) return fail(error.message);
  if (!data) return fail("Akun tidak ditemukan atau tidak bisa diubah.");

  revalidatePath("/dashboard", "layout");
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

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Akun tidak valid.");

  const [transactions, oldBudgets, allocations, recurring] = await Promise.all([
    supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .or(`account_id.eq.${id},to_account_id.eq.${id}`),
    supabase.from("budgets").select("id", { count: "exact", head: true }).eq("household_id", householdId).eq("account_id", id),
    supabase.from("account_allocations").select("id", { count: "exact", head: true }).eq("household_id", householdId).eq("account_id", id),
    supabase.from("recurring_transactions").select("id", { count: "exact", head: true }).eq("household_id", householdId).or(`account_id.eq.${id},to_account_id.eq.${id}`),
  ]);

  // If a query fails (for example migration 0010 has not run), never fall
  // through to a hard delete: that could orphan history or fixed positions.
  const countError = transactions.error ?? oldBudgets.error ?? allocations.error ?? recurring.error;
  if (countError) return fail(`Tidak bisa memeriksa penggunaan akun. Pastikan migrasi database terbaru sudah dijalankan. ${countError.message}`);

  const transactionCount = transactions.count;
  const oldBudgetCount = oldBudgets.count;
  const allocationCount = allocations.count;
  const recurringCount = recurring.count;

  if ((transactionCount ?? 0) > 0 || (oldBudgetCount ?? 0) > 0 || (allocationCount ?? 0) > 0 || (recurringCount ?? 0) > 0) {
    const { data, error } = await supabase
      .from("accounts")
      .update({ is_active: false })
      .eq("id", id)
      .eq("household_id", householdId)
      .select("id")
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Akun tidak ditemukan atau tidak bisa diarsipkan.");
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  }

  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
