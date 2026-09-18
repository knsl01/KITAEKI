import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function getUserClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null } as const;
  return { supabase, user } as const;
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

export function fail(error: string): ActionResult {
  return { ok: false, error };
}

export const UNAUTH = "Sesi kamu sudah habis. Masuk lagi untuk melanjutkan.";
