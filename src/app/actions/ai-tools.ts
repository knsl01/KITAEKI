"use server";

import { revalidatePath } from "next/cache";
import { getUserClient, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";
import type { MemberOwner, TransactionType } from "@/lib/types";
import { pushActivity, rupiah } from "@/lib/push";

type AiToolName = "add_income" | "add_expense" | "delete_transaction" | "update_transaction" | "create_savings_goal" | "create_event" | "create_trip" | "update_event" | "delete_event";
type ToolArgs = Record<string, unknown>;
type ToolResult = ActionResult & { message?: string };
const OWNER_KEYS: readonly MemberOwner[] = ["eki", "dinda", "shared"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is ToolArgs {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArg(args: ToolArgs, key: string, required = false): string | undefined {
  const value = args[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 300 ? trimmed : required ? undefined : "";
}

function amountArg(args: ToolArgs, key: string, required = false): number | undefined {
  const value = args[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1_000_000_000_000) return undefined;
  return value;
}

function dateArg(args: ToolArgs, key: string): string | undefined {
  const value = args[key];
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}

function ownerArg(args: ToolArgs): MemberOwner | undefined {
  const value = args.owner;
  return value === undefined ? undefined : OWNER_KEYS.find((owner) => owner === value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Aksi tidak bisa disimpan. Coba lagi.";
}

function success(message: string): ToolResult {
  return { ok: true, message };
}

function failure(error: string): ToolResult {
  return { ok: false, error };
}

export async function aiExecuteTool(toolName: string, rawArgs: unknown): Promise<ToolResult> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
  if (!user) return failure(UNAUTH);
  if (!householdId) return failure(NO_HOUSEHOLD);
  if (!isRecord(rawArgs)) return failure("Detail perintah tidak lengkap. Coba tulis ulang dengan informasi yang jelas.");
  const args = rawArgs;

  try {
    if (toolName === "add_income" || toolName === "add_expense") {
      const type: TransactionType = toolName === "add_income" ? "income" : "expense";
      const amount = amountArg(args, "amount");
      const accountId = stringArg(args, "account_id", true);
      const title = stringArg(args, "title", true);
      const date = dateArg(args, "date");
      const owner = ownerArg(args);
      const categoryId = stringArg(args, "category_id");
      if (!amount || !accountId || !UUID.test(accountId) || !title || !date || (args.owner !== undefined && !owner) || (categoryId && !UUID.test(categoryId))) {
        return failure("Perintah belum lengkap atau ada data yang tidak valid. Pastikan nominal, judul, akun, dan tanggalnya jelas.");
      }

      const { data: account, error: accountError } = await supabase.from("accounts").select("id").eq("id", accountId).eq("household_id", householdId).eq("is_active", true).maybeSingle();
      if (accountError) throw accountError;
      if (!account) return failure("Akun yang dipilih tidak ditemukan atau sudah tidak aktif.");

      if (categoryId) {
        const kind = type === "income" ? "income" : "expense";
        const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("id", categoryId).eq("household_id", householdId).eq("kind", kind).maybeSingle();
        if (categoryError) throw categoryError;
        if (!category) return failure("Kategori tersebut tidak ditemukan atau jenisnya tidak cocok dengan transaksi.");
      }

      let budgetPostId: string | null = null;
      if (type === "expense" && categoryId) {
        const { data: allocation, error: allocationError } = await supabase.from("account_allocations").select("id").eq("household_id", householdId).eq("account_id", accountId).eq("category_id", categoryId).maybeSingle();
        if (allocationError) throw allocationError;
        budgetPostId = allocation?.id ?? null;
      }

      const { error } = await supabase.from("transactions").insert({ household_id: householdId, user_id: user.id, type, amount, account_id: accountId, category_id: categoryId || null, budget_post_id: budgetPostId, occurred_on: date, owner: owner ?? "shared", description: title });
      if (error) throw error;
      await pushActivity(session, ({ who }) => ({ title: type === "income" ? "💰 Pemasukan baru" : "💸 Pengeluaran baru", body: `${who} (via KITA AI): ${title} · ${rupiah(amount)}`, url: "/dashboard/transactions" }));
      revalidatePath("/dashboard", "layout");
      return success(`${type === "income" ? "Pemasukan" : "Pengeluaran"} “${title}” sebesar ${rupiah(amount)} berhasil dicatat.`);
    }

    if (toolName === "delete_transaction") {
      const id = stringArg(args, "id", true);
      if (!id || !UUID.test(id)) return failure("ID transaksi tidak valid.");
      const { data, error } = await supabase.from("transactions").delete().eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return failure("Transaksi tidak ditemukan, mungkin sudah dihapus.");
      revalidatePath("/dashboard", "layout");
      return success("Transaksi berhasil dihapus.");
    }

    if (toolName === "update_transaction") {
      const id = stringArg(args, "id", true);
      if (!id || !UUID.test(id)) return failure("ID transaksi tidak valid.");
      const { data: current, error: lookupError } = await supabase.from("transactions").select("id, type, amount, account_id, category_id, budget_post_id, occurred_on, owner, description").eq("id", id).eq("household_id", householdId).maybeSingle();
      if (lookupError) throw lookupError;
      if (!current) return failure("Transaksi tidak ditemukan, jadi belum ada perubahan yang dibuat.");

      const updates: { amount?: number; account_id?: string; category_id?: string | null; budget_post_id?: string | null; occurred_on?: string; owner?: MemberOwner; description?: string | null } = {};
      const title = stringArg(args, "title");
      const amount = amountArg(args, "amount");
      const accountId = stringArg(args, "account_id");
      const categoryId = stringArg(args, "category_id");
      const date = dateArg(args, "date");
      const owner = ownerArg(args);
      if (args.title !== undefined && title === undefined) return failure("Nama transaksi tidak valid.");
      if (args.amount !== undefined && amount === undefined) return failure("Nominal transaksi tidak valid.");
      if (args.account_id !== undefined && (!accountId || !UUID.test(accountId))) return failure("Akun transaksi tidak valid.");
      if (args.category_id !== undefined && categoryId === undefined) return failure("Kategori transaksi tidak valid.");
      if (args.date !== undefined && date === undefined) return failure("Tanggal harus memakai format YYYY-MM-DD yang valid.");
      if (args.owner !== undefined && !owner) return failure("Pemilik transaksi tidak valid.");
      if (title !== undefined) updates.description = title || null;
      if (amount !== undefined) updates.amount = amount;
      if (accountId) updates.account_id = accountId;
      if (categoryId !== undefined) updates.category_id = categoryId || null;
      if (date) updates.occurred_on = date;
      if (owner) updates.owner = owner;
      if (Object.keys(updates).length === 0) return failure("Tulis bagian transaksi yang ingin diubah.");

      const resultingAccount = updates.account_id ?? current.account_id;
      const resultingCategory = updates.category_id === undefined ? current.category_id : updates.category_id;
      if (updates.account_id) {
        const { data: account, error } = await supabase.from("accounts").select("id").eq("id", updates.account_id).eq("household_id", householdId).eq("is_active", true).maybeSingle();
        if (error) throw error;
        if (!account) return failure("Akun baru tidak ditemukan atau sudah tidak aktif.");
      }
      if (resultingCategory) {
        const expectedKind = current.type === "income" ? "income" : "expense";
        const { data: category, error } = await supabase.from("categories").select("id").eq("id", resultingCategory).eq("household_id", householdId).eq("kind", expectedKind).maybeSingle();
        if (error) throw error;
        if (!category) return failure("Kategori baru tidak ditemukan atau jenisnya tidak cocok.");
      }
      if (current.type === "expense" && (updates.account_id !== undefined || updates.category_id !== undefined)) {
        if (resultingCategory && resultingAccount) {
          const { data: post, error } = await supabase.from("account_allocations").select("id").eq("household_id", householdId).eq("account_id", resultingAccount).eq("category_id", resultingCategory).maybeSingle();
          if (error) throw error;
          updates.budget_post_id = post?.id ?? null;
        } else updates.budget_post_id = null;
      }
      const { error } = await supabase.from("transactions").update(updates).eq("id", id).eq("household_id", householdId);
      if (error) throw error;
      revalidatePath("/dashboard", "layout");
      return success("Transaksi berhasil diperbarui.");
    }

    if (toolName === "create_savings_goal") {
      const name = stringArg(args, "name", true);
      const targetAmount = amountArg(args, "target_amount");
      const targetDate = dateArg(args, "target_date");
      const owner = ownerArg(args);
      if (!name || !targetAmount || !targetDate || (args.owner !== undefined && !owner)) return failure("Nama, nominal target, tanggal target, dan pemilik tabungan harus valid.");
      const { error } = await supabase.from("savings_goals").insert({ household_id: householdId, user_id: user.id, name, target_amount: targetAmount, target_date: targetDate, owner: owner ?? "shared" });
      if (error) throw error;
      revalidatePath("/dashboard", "layout");
      return success(`Target tabungan “${name}” berhasil dibuat.`);
    }

    if (toolName === "create_event" || toolName === "create_trip") {
      const title = stringArg(args, "title", true);
      const date = dateArg(args, "date");
      const owner = ownerArg(args);
      if (!title || !date || (args.owner !== undefined && !owner)) return failure("Judul, tanggal, dan pemilik agenda harus valid.");
      const { error } = await supabase.from("tasks").insert({ household_id: householdId, created_by: user.id, title, due_on: date, assigned_to: owner ?? "shared" });
      if (error) throw error;
      revalidatePath("/dashboard", "layout");
      return success(`${toolName === "create_trip" ? "Rencana perjalanan" : "Agenda"} “${title}” berhasil dibuat.`);
    }

    if (toolName === "update_event") {
      const id = stringArg(args, "id", true);
      if (!id || !UUID.test(id)) return failure("ID agenda tidak valid.");
      const updates: { title?: string; due_on?: string; assigned_to?: MemberOwner } = {};
      const title = stringArg(args, "title");
      const date = dateArg(args, "date");
      const owner = ownerArg(args);
      if (args.title !== undefined && title === undefined) return failure("Judul agenda tidak valid.");
      if (args.date !== undefined && date === undefined) return failure("Tanggal agenda tidak valid.");
      if (args.owner !== undefined && !owner) return failure("Pemilik agenda tidak valid.");
      if (title) updates.title = title;
      if (date) updates.due_on = date;
      if (owner && args.owner !== undefined) updates.assigned_to = owner;
      if (Object.keys(updates).length === 0) return failure("Tulis perubahan agenda yang diinginkan.");
      const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return failure("Agenda tidak ditemukan.");
      revalidatePath("/dashboard", "layout");
      return success("Agenda berhasil diperbarui.");
    }

    if (toolName === "delete_event") {
      const id = stringArg(args, "id", true);
      if (!id || !UUID.test(id)) return failure("ID agenda tidak valid.");
      const { data, error } = await supabase.from("tasks").delete().eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return failure("Agenda tidak ditemukan, mungkin sudah dihapus.");
      revalidatePath("/dashboard", "layout");
      return success("Agenda berhasil dihapus.");
    }

    return failure("Perintah ini belum didukung KITA AI.");
  } catch (error) {
    console.error("KITA AI tool execution failed:", toolName, error);
    return failure(`Aksi belum berhasil disimpan: ${errorMessage(error)}`);
  }
}
