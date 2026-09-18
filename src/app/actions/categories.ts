"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const name = str(formData, "name");
  const kind = str(formData, "kind") || "expense";
  const color = str(formData, "color") || "#3F5540";
  const icon_key = optionalStr(formData, "icon_key");

  if (!name) return fail("Nama kategori wajib diisi.");

  const { error } = await supabase.from("categories").insert({ user_id: user.id, household_id: householdId, name, kind, color, icon_key });
  if (error) {
    return fail(error.code === "23505" ? "Kategori dengan nama itu sudah ada." : error.message);
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const name = str(formData, "name");
  const kind = str(formData, "kind") || "expense";
  const color = str(formData, "color") || "#3F5540";
  const icon_key = optionalStr(formData, "icon_key");
  if (!name) return fail("Nama kategori wajib diisi.");

  const { error } = await supabase
    .from("categories")
    .update({ name, kind, color, icon_key })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase.from("categories").delete().eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
