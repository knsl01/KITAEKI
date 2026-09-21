"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";
import { pushActivity, rupiah } from "@/lib/push";
import type { TransactionType } from "@/lib/types";

const TYPES: TransactionType[] = ["income", "expense", "transfer"];

function revalidateAll() {
  revalidatePath("/dashboard", "layout");
}

function parseTransaction(formData: FormData) {
  const type = str(formData, "type") as TransactionType;
  const amount = num(formData, "amount");
  const occurred_on = str(formData, "occurred_on");
  const account_id = optionalStr(formData, "account_id");
  const to_account_id = optionalStr(formData, "to_account_id");
  const category_id = optionalStr(formData, "category_id");
  const owner = str(formData, "owner") || "shared";
  const description = optionalStr(formData, "description");

  if (!TYPES.includes(type)) return { error: "Jenis transaksi tidak valid." } as const;
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Nominal harus lebih dari 0." } as const;
  if (!occurred_on) return { error: "Tanggal wajib diisi." } as const;
  if (!account_id) return { error: "Pilih akun sumber dana." } as const;
  if (type === "transfer") {
    if (!to_account_id) return { error: "Pilih akun tujuan transfer." } as const;
    if (to_account_id === account_id) return { error: "Akun asal dan tujuan tidak boleh sama." } as const;
  }

  return {
    values: {
      type,
      amount,
      occurred_on,
      account_id,
      to_account_id: type === "transfer" ? to_account_id : null,
      category_id: type === "transfer" ? null : category_id,
      owner,
      description,
    },
  } as const;
}

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const parsed = parseTransaction(formData);
  if ("error" in parsed && parsed.error) return fail(parsed.error);

  const { error } = await supabase.from("transactions").insert({ ...parsed.values, user_id: user.id, household_id: householdId });
  if (error) return fail(error.message);

  const v = parsed.values;
  await pushActivity(session, ({ who }) => ({
    title: v.type === "income" ? "💰 Pemasukan baru" : v.type === "expense" ? "💸 Pengeluaran baru" : "🔁 Transfer baru",
    body: `${who} mencatat ${v.description ? `${v.description} · ` : ""}${rupiah(v.amount)}`,
    url: "/dashboard/transactions",
  }));

  revalidateAll();
  return { ok: true };
}

export async function updateTransaction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const parsed = parseTransaction(formData);
  if ("error" in parsed && parsed.error) return fail(parsed.error);

  const { error } = await supabase.from("transactions").update(parsed.values).eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  const v = parsed.values;
  await pushActivity(session, ({ who }) => ({
    title: "✏️ Transaksi diubah",
    body: `${who} mengubah ${v.description ? `${v.description} · ` : ""}${rupiah(v.amount)}`,
    url: "/dashboard/transactions",
  }));

  revalidateAll();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  // Ambil ringkasan dulu supaya notifikasinya informatif setelah barisnya hilang.
  const { data: before } = await supabase
    .from("transactions")
    .select("amount, description")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  if (before) {
    await pushActivity(session, ({ who }) => ({
      title: "🗑️ Transaksi dihapus",
      body: `${who} menghapus ${before.description ? `${before.description} · ` : ""}${rupiah(Number(before.amount))}`,
      url: "/dashboard/transactions",
    }));
  }

  revalidateAll();
  return { ok: true };
}
