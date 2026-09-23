"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

export async function upsertAccountAllocation(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const allocationId = optionalStr(formData, "allocation_id");
  const accountId = optionalStr(formData, "account_id");
  const posName = optionalStr(formData, "pos_name");
  let categoryId = optionalStr(formData, "category_id");
  let createCategoryName: string | null = null;
  const targetAmount = num(formData, "target_amount");

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return fail("Nominal kebutuhan harus lebih dari 0.");
  if (allocationId && !/^[0-9a-f-]{36}$/i.test(allocationId)) return fail("Pos tidak valid.");
  if (!accountId || !/^[0-9a-f-]{36}$/i.test(accountId)) return fail("Pilih akun sumber untuk pos ini.");
  if (posName && posName.length > 100) return fail("Nama pos maksimal 100 karakter.");
  const { data: account, error: accountError } = await supabase.from("accounts").select("id, name").eq("id", accountId).eq("household_id", householdId).eq("is_active", true).maybeSingle();
  if (accountError) return fail(accountError.message);
  if (!account) return fail("Akun tidak ditemukan atau sudah dinonaktifkan.");

  if (posName) {
    const { data: existing, error: existingError } = await supabase.from("categories").select("id").eq("household_id", householdId).eq("kind", "expense").ilike("name", posName).maybeSingle();
    if (existingError) return fail(existingError.message);
    if (existing) categoryId = existing.id;
    else createCategoryName = posName;
  }
  if (!categoryId && !createCategoryName) return fail("Tulis nama pos.");
  if (categoryId) {
    if (!/^[0-9a-f-]{36}$/i.test(categoryId)) return fail("Kategori pos tidak valid.");
    const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("id", categoryId).eq("household_id", householdId).eq("kind", "expense").maybeSingle();
    if (categoryError) return fail(categoryError.message);
    if (!category) return fail("Kategori pos tidak valid.");
  }

  let currentAllocationId = allocationId;
  if (!currentAllocationId && categoryId) {
    const { data: existingAllocation, error: lookupError } = await supabase.from("account_allocations")
      .select("id").eq("household_id", householdId).eq("account_id", accountId).eq("category_id", categoryId).maybeSingle();
    if (lookupError) return fail(lookupError.message);
    currentAllocationId = existingAllocation?.id;
  }
  const { data: currentAllocation, error: currentAllocationError } = currentAllocationId
    ? await supabase.from("account_allocations").select("id, account_id, allocated_amount, spent_amount").eq("id", currentAllocationId).eq("household_id", householdId).maybeSingle()
    : { data: null, error: null };
  if (currentAllocationError) return fail(currentAllocationError.message);

  const allocatedRaw = formData.get("allocated_amount");
  const allocatedAmount = allocatedRaw === null
    ? (currentAllocation ? Math.min(Number(currentAllocation.allocated_amount), targetAmount) : 0)
    : num(formData, "allocated_amount");
  if (!Number.isFinite(allocatedAmount) || allocatedAmount < 0) return fail("Nominal dana di dalam pos tidak valid.");
  if (allocatedAmount > targetAmount) return fail("Dana di dalam pos tidak boleh melebihi kebutuhan/target.");

  if (createCategoryName) {
    if (Number(currentAllocation?.spent_amount ?? 0) > 0) return fail("Nama pos yang sudah dipakai transaksi tidak bisa diganti.");
    const { data: created, error } = await supabase.from("categories")
      .insert({ user_id: user.id, household_id: householdId, name: createCategoryName, kind: "expense", color: "#6D4CC6" })
      .select("id").single();
    if (error || !created) return fail(error?.message ?? "Pos tidak bisa dibuat.");
    categoryId = created.id;
  }

  const values = { account_id: accountId, category_id: categoryId, target_amount: targetAmount, allocated_amount: allocatedAmount, updated_at: new Date().toISOString() };
  if (currentAllocationId) {
    const { data, error } = await supabase.from("account_allocations").update(values).eq("id", currentAllocationId).eq("household_id", householdId).select("id").maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Pos tidak ditemukan.");
  } else {
    const { error } = await supabase.from("account_allocations").insert({ ...values, user_id: user.id, household_id: householdId });
    if (error) return fail(error.message);
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/finance");
  return { ok: true };
}

export async function fillAccountAllocation(id: string, amount: number): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Pos tidak valid.");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Masukkan nominal yang ingin diisi ke pos.");
  const { data, error } = await supabase.rpc("fill_account_allocation", { p_allocation_id: id, p_amount: amount });
  if (error) return fail(error.message);
  if (Number(data) <= 0) return fail("Nominal belum bisa dialokasikan.");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/finance");
  return { ok: true };
}

export async function deleteAccountAllocation(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Pos tidak valid.");
  const { data, error } = await supabase.from("account_allocations").delete().eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
  if (error) return fail(error.message);
  if (!data) return fail("Pos tidak ditemukan.");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/finance");
  return { ok: true };
}

/** Compatibility exports for older Pos/Budget components still in use. */
export async function upsertBudget(formData: FormData): Promise<ActionResult> {
  return upsertAccountAllocation(formData);
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  return deleteAccountAllocation(id);
}

