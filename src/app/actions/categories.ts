"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, str, UNAUTH, type ActionResult } from "./_shared";

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const name = str(formData, "name");
  const kind = str(formData, "kind") || "expense";
  const color = str(formData, "color") || "#3F5540";

  if (!name) return fail("Nama kategori wajib diisi.");

  const { error } = await supabase.from("categories").insert({ user_id: user.id, name, kind, color });
  if (error) {
    return fail(error.code === "23505" ? "Kategori dengan nama itu sudah ada." : error.message);
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const name = str(formData, "name");
  const kind = str(formData, "kind") || "expense";
  const color = str(formData, "color") || "#3F5540";
  if (!name) return fail("Nama kategori wajib diisi.");

  const { error } = await supabase
    .from("categories")
    .update({ name, kind, color })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
