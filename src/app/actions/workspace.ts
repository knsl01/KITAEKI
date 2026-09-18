"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, optionalStr, str, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";
import type { MemberOwner } from "@/lib/types";

export async function updateBanner(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const banner_title = str(formData, "banner_title") || "Selamat datang";
  const banner_subtitle = str(formData, "banner_subtitle");
  const banner_quote = str(formData, "banner_quote");
  const banner_image_url = optionalStr(formData, "banner_image_url");

  const { error } = await supabase.from("workspace_settings").upsert(
    {
      household_id: householdId,
      banner_title,
      banner_subtitle,
      banner_quote,
      banner_image_url,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "household_id" }
  );
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function renameHousehold(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const name = str(formData, "name");
  if (!name) return fail("Nama workspace wajib diisi.");

  const { error } = await supabase.from("households").update({ name }).eq("id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Menentukan apakah user ini berperan sebagai Eki atau Dinda di workspace. */
export async function setMemberKey(memberKey: MemberOwner): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);
  if (memberKey === "shared") return fail("Pilih Eki atau Dinda.");

  const { error } = await supabase
    .from("household_members")
    .update({ member_key: memberKey })
    .eq("household_id", householdId)
    .eq("user_id", user.id);
  if (error) return fail(error.message);

  await supabase.from("profiles").update({ default_owner: memberKey }).eq("id", user.id);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Bergabung ke workspace pasangan memakai kode undangan. */
export async function joinHousehold(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);

  const code = str(formData, "invite_code").toLowerCase();
  const memberKey = (str(formData, "member_key") || "dinda") as MemberOwner;
  if (!code) return fail("Masukkan kode undangan.");

  const { error } = await supabase.rpc("join_household", { p_code: code, p_member_key: memberKey });
  if (error) return fail(error.message.replace(/^.*?:\s*/, ""));

  revalidatePath("/", "layout");
  return { ok: true };
}
