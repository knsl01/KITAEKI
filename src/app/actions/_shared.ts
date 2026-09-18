import { createClient } from "@/lib/supabase/server";
import type { MemberOwner } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Konteks workspace: user yang login plus household tempat semua data disimpan.
 * Eki dan Dinda punya login berbeda tapi household_id yang sama.
 */
export async function getUserClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, householdId: null, memberKey: "eki" as MemberOwner } as const;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, member_key")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    householdId: (membership?.household_id as string | undefined) ?? null,
    memberKey: (membership?.member_key as MemberOwner | undefined) ?? "eki",
  } as const;
}

export function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optionalStr(form: FormData, key: string) {
  const v = str(form, key);
  return v.length ? v : null;
}

export function num(form: FormData, key: string) {
  const raw = str(form, key).replace(/[^\d.-]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export function optionalNum(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const n = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function bool(form: FormData, key: string) {
  const v = str(form, key);
  return v === "true" || v === "on" || v === "1";
}

export function fail(error: string): ActionResult {
  return { ok: false, error };
}

export const UNAUTH = "Sesi kamu sudah habis. Masuk lagi untuk melanjutkan.";
export const NO_HOUSEHOLD = "Workspace belum siap. Buka Pengaturan untuk membuat atau bergabung ke workspace.";
