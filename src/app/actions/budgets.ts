"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

export async function upsertAccountAllocation(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const allocationId = optionalStr(formData, "allocation_id");
  const accountId = optionalStr(formData, "account_id");
  const posName = optionalStr(formData, "pos_name");
  let categoryId = optionalStr(formData, "category_id");
  const amount = num(formData, "amount");

  if (!Number.isFinite(amount) || amount <= 0) return fail("Nominal alokasi harus lebih dari 0.");
  if (posName && posName.length > 100) return fail("Nama pos maksimal 100 karakter.");
  if (accountId) {
    if (!/^[0-9a-f-]{36}$/i.test(accountId)) return fail("Akun tidak valid.");
    const { data: account } = await supabase.from("accounts").select("id").eq("id", accountId).eq("household_id", householdId).eq("is_active", true).maybeSingle();
    if (!account) return fail("Akun tidak ditemukan atau sudah dinonaktifkan.");
  }

  if (posName) {
    const { data: existing } = await supabase.from("categories").select("id").eq("household_id", householdId).eq("kind", "expense").ilike("name", posName).maybeSingle();
    if (existing) categoryId = existing.id;
    else {
      const { data: created, error } = await supabase
        .from("categories")
        .insert({ user_id: user.id, household_id: householdId, name: posName, kind: "expense", color: "#6D4CC6" })
        .select("id")
        .single();
      if (error || !created) return fail(error?.message ?? "Pos tidak bisa dibuat.");
      categoryId = created.id;
    }
  }
  if (!categoryId || !/^[0-9a-f-]{36}$/i.test(categoryId)) return fail("Pilih atau tulis nama pos.");
  const { data: category } = await supabase.from("categories").select("id").eq("id", categoryId).eq("household_id", householdId).eq("kind", "expense").maybeSingle();
  if (!category) return fail("Kategori pos tidak valid.");

  const values = { account_id: accountId, category_id: categoryId, amount, updated_at: new Date().toISOString() };
  if (allocationId) {
    if (!/^[0-9a-f-]{36}$/i.test(allocationId)) return fail("Pos tidak valid.");
    const { data, error } = await supabase.from("account_allocations").update(values).eq("id", allocationId).eq("household_id", householdId).select("id").maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Pos tidak ditemukan.");
  } else {
    let existingQuery = supabase.from("account_allocations").select("id").eq("household_id", householdId).eq("category_id", categoryId);
    existingQuery = accountId ? existingQuery.eq("account_id", accountId) : existingQuery.is("account_id", null);
    const { data: existingAllocation, error: lookupError } = await existingQuery.maybeSingle();
    if (lookupError) return fail(lookupError.message);
    if (existingAllocation) {
      const { error } = await supabase.from("account_allocations").update(values).eq("id", existingAllocation.id).eq("household_id", householdId);
      if (error) return fail(error.message);
    } else {
      const { error } = await supabase.from("account_allocations").insert({ ...values, user_id: user.id, household_id: householdId });
      if (error) return fail(error.message);
    }
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/accounts");
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
  return { ok: true };
}

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
