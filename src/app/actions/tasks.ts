"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, OWNER_KEYS, optionalStr, pick, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

export async function createTask(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const title = str(formData, "title");
  if (!title) return fail("Judul tugas wajib diisi.");

  const { error } = await supabase.from("tasks").insert({
    household_id: householdId,
    created_by: user.id,
    assigned_to: pick(formData, "assigned_to", OWNER_KEYS, "shared"),
    title,
    detail: optionalStr(formData, "detail"),
    due_on: optionalStr(formData, "due_on"),
  });
  if (error) return fail(error.message);

  revalidatePath("/dashboard/tasks");
  return { ok: true };
}

export async function toggleTask(id: string, done: boolean): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase
    .from("tasks")
    .update({ is_done: done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard/tasks");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard/tasks");
  return { ok: true };
}
