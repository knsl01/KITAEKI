"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, str, UNAUTH, type ActionResult } from "./_shared";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const full_name = str(formData, "full_name");
  const default_owner = str(formData, "default_owner") || "shared";
  const avatar_url = str(formData, "avatar_url");

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email, full_name, default_owner, avatar_url });
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const password = str(formData, "password");
  if (password.length < 6) return fail("Password minimal 6 karakter.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(error.message);

  return { ok: true };
}
