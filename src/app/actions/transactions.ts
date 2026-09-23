"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";
import { pushActivity, rupiah } from "@/lib/push";
import type { TransactionType } from "@/lib/types";

const TYPES: TransactionType[] = ["income", "expense", "transfer"];
type ParsedTransaction = {
  type: TransactionType;
  amount: number;
  occurred_on: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  budget_post_id: string | null;
  owner: string;
  description: string | null;
};

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
  const budget_post_id = optionalStr(formData, "budget_post_id");
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
      budget_post_id: type === "expense" ? budget_post_id : null,
      owner,
      description,
    },
  } as const;
}

async function validateReferences(
  supabase: Awaited<ReturnType<typeof getUserClient>>["supabase"],
  householdId: string,
  values: ParsedTransaction,
  transactionId?: string,
) {
  const accountIds = [values.account_id, values.to_account_id].filter((id): id is string => Boolean(id));
  const { data: accounts, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .in("id", accountIds);
  if (accountError) return accountError.message;
  if ((accounts?.length ?? 0) !== new Set(accountIds).size) return "Pilih akun yang masih aktif.";

  if (values.category_id) {
    const expectedKind = values.type === "income" ? "income" : "expense";
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", values.category_id)
      .eq("household_id", householdId)
      .eq("kind", expectedKind)
      .maybeSingle();
    if (categoryError) return categoryError.message;
    if (!category) return "Kategori transaksi tidak valid.";
  }
  if (values.budget_post_id) {
    if (values.type !== "expense") return "Pos hanya bisa dipakai pada transaksi pengeluaran.";
    const { data: post, error: postError } = await supabase.from("account_allocations")
      .select("id, account_id, category_id, allocated_amount")
      .eq("id", values.budget_post_id)
      .eq("household_id", householdId)
      .maybeSingle();
    if (postError) return postError.message;
    if (!post || post.account_id !== values.account_id || post.category_id !== values.category_id) {
      return "Akun dan kategori harus sesuai dengan pos yang dipilih.";
    }

    let availableInPost = Number(post.allocated_amount);
    if (transactionId) {
      const { data: previous, error: previousError } = await supabase.from("transactions")
        .select("amount, budget_post_id").eq("id", transactionId).eq("household_id", householdId).maybeSingle();
      if (previousError) return previousError.message;
      if (previous?.budget_post_id === values.budget_post_id) availableInPost += Number(previous.amount);
    }
    if (values.amount > availableInPost) {
      return `Nominal melebihi dana yang tersedia di pos (${Math.max(availableInPost, 0)}).`;
    }
  }
  return null;
}

/** Kategori "Lainnya" disimpan sebagai kategori sungguhan agar tetap bisa dipakai
 * pada transaksi berikutnya, laporan, dan pos anggaran. */
async function resolveCustomCategory(formData: FormData, type: TransactionType, householdId: string) {
  if (type === "transfer") return;
  const name = optionalStr(formData, "custom_category");
  if (!name) return;

  const { supabase, user } = await getUserClient();
  if (!user) return;
  const kind = type === "income" ? "income" : "expense";
  const { data: found } = await supabase
    .from("categories")
    .select("id")
    .eq("household_id", householdId)
    .eq("kind", kind)
    .ilike("name", name)
    .maybeSingle();

  if (found) {
    formData.set("category_id", found.id);
    return;
  }

  const { data: created, error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, household_id: householdId, name, kind, color: kind === "income" ? "#2E8B57" : "#6D4CC6" })
    .select("id")
    .single();
  if (!error && created) formData.set("category_id", created.id);
}

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const type = str(formData, "type") as TransactionType;
  await resolveCustomCategory(formData, type, householdId);
  const parsed = parseTransaction(formData);
  if ("error" in parsed && parsed.error) return fail(parsed.error);
  const referenceError = await validateReferences(supabase, householdId, parsed.values);
  if (referenceError) return fail(referenceError);

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

  const type = str(formData, "type") as TransactionType;
  await resolveCustomCategory(formData, type, householdId);
  const parsed = parseTransaction(formData);
  if ("error" in parsed && parsed.error) return fail(parsed.error);
  const referenceError = await validateReferences(supabase, householdId, parsed.values, id);
  if (referenceError) return fail(referenceError);

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
