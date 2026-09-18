"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, num, str, UNAUTH, type ActionResult } from "./_shared";

export async function upsertBudget(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const category_id = str(formData, "category_id");
  const amount = num(formData, "amount");
  const month = str(formData, "period_month"); // "YYYY-MM"

  if (!category_id) return fail("Pilih kategori.");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Nominal anggaran harus lebih dari 0.");
  if (!/^\d{4}-\d{2}$/.test(month)) return fail("Periode tidak valid.");

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category_id, amount, period_month: `${month}-01` },
      { onConflict: "user_id,category_id,period_month" }
    );
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
