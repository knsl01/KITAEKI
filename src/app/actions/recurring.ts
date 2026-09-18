"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";
import type { RecurringFrequency, TransactionType } from "@/lib/types";

function nextDate(from: string, frequency: RecurringFrequency) {
  const d = new Date(`${from}T00:00:00Z`);
  if (frequency === "daily") d.setUTCDate(d.getUTCDate() + 1);
  if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  if (frequency === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  if (frequency === "yearly") d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function parse(formData: FormData) {
  const type = str(formData, "type") as TransactionType;
  const amount = num(formData, "amount");
  const frequency = (str(formData, "frequency") || "monthly") as RecurringFrequency;
  const next_run_on = str(formData, "next_run_on");
  const account_id = optionalStr(formData, "account_id");
  const to_account_id = optionalStr(formData, "to_account_id");
  const category_id = optionalStr(formData, "category_id");
  const owner = str(formData, "owner") || "shared";
  const description = optionalStr(formData, "description");

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Nominal harus lebih dari 0." } as const;
  if (!next_run_on) return { error: "Tanggal jatuh tempo wajib diisi." } as const;
  if (!account_id) return { error: "Pilih akun." } as const;
  if (type === "transfer" && !to_account_id) return { error: "Pilih akun tujuan." } as const;

  return {
    values: {
      type,
      amount,
      frequency,
      next_run_on,
      account_id,
      to_account_id: type === "transfer" ? to_account_id : null,
      category_id: type === "transfer" ? null : category_id,
      owner,
      description,
    },
  } as const;
}

export async function createRecurring(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const parsed = parse(formData);
  if ("error" in parsed && parsed.error) return fail(parsed.error);

  const { error } = await supabase.from("recurring_transactions").insert({ ...parsed.values, user_id: user.id, household_id: householdId });
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateRecurring(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const parsed = parse(formData);
  if ("error" in parsed && parsed.error) return fail(parsed.error);

  const { error } = await supabase
    .from("recurring_transactions")
    .update(parsed.values)
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function toggleRecurring(id: string, isActive: boolean): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase
    .from("recurring_transactions")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase.from("recurring_transactions").delete().eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Catat tagihan berulang jadi transaksi nyata, lalu majukan tanggal berikutnya. */
export async function runRecurringNow(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { data: row, error: readError } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("id", id)
    .eq("household_id", householdId)
    .single();
  if (readError || !row) return fail("Transaksi berulang tidak ditemukan.");

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: user.id,
    household_id: householdId,
    type: row.type,
    amount: row.amount,
    occurred_on: row.next_run_on,
    description: row.description,
    owner: row.owner,
    account_id: row.account_id,
    to_account_id: row.to_account_id,
    category_id: row.category_id,
  });
  if (insertError) return fail(insertError.message);

  const { error: updateError } = await supabase
    .from("recurring_transactions")
    .update({ next_run_on: nextDate(row.next_run_on, row.frequency) })
    .eq("id", id)
    .eq("household_id", householdId);
  if (updateError) return fail(updateError.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
