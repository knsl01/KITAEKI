"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";
import { defaultLayout, parseLayoutInput, sanitizeBalanceStyle, toPayload } from "@/lib/widgets";

const MIGRATION_HINT =
  "Kolom widget belum ada di database. Jalankan supabase/migrations/0003_dashboard_widgets.sql di SQL Editor Supabase, lalu coba lagi.";

/** Galat "kolom tidak ada" hampir selalu berarti migrasi 0003 belum dijalankan. */
function explain(message: string) {
  return /row_span|config|schema cache|column/i.test(message) ? MIGRATION_HINT : message;
}

/**
 * Menyimpan susunan, ukuran, dan widget yang tampil untuk user yang login.
 * Pengaturan khusus widget (kolom config) sengaja tidak disentuh di sini.
 */
export async function saveDashboardLayout(input: unknown): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const parsed = parseLayoutInput(input);
  if (!parsed.ok) return fail(parsed.error);

  const rows = toPayload(parsed.layout).map((row) => ({
    ...row,
    household_id: householdId,
    user_id: user.id,
  }));

  const { error } = await supabase.from("dashboard_widgets").upsert(rows, { onConflict: "user_id,widget_key" });
  if (error) return fail(explain(error.message));

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Foto latar dan tingkat gelap untuk kartu Total saldo.
 * Foto harus berasal dari folder household ini di bucket kita-media.
 */
export async function updateBalanceStyle(input: unknown): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const style = sanitizeBalanceStyle(input);

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (style.bg_url && base) {
    const allowedPrefix = `${base}/storage/v1/object/public/kita-media/${householdId}/`;
    if (!style.bg_url.startsWith(allowedPrefix)) return fail("Gunakan foto yang diunggah lewat KITA.");
  }

  const { data: existing, error: readError } = await supabase
    .from("dashboard_widgets")
    .select("widget_key")
    .eq("user_id", user.id)
    .eq("widget_key", "balance")
    .maybeSingle();
  if (readError) return fail(explain(readError.message));

  if (existing) {
    const { error } = await supabase
      .from("dashboard_widgets")
      .update({ config: style })
      .eq("user_id", user.id)
      .eq("widget_key", "balance");
    if (error) return fail(explain(error.message));
  } else {
    // Belum pernah menyimpan susunan: simpan susunan bawaan sekalian supaya semua baris konsisten.
    const rows = toPayload(defaultLayout()).map((row) => ({
      ...row,
      household_id: householdId,
      user_id: user.id,
      config: row.widget_key === "balance" ? style : {},
    }));
    const { error } = await supabase.from("dashboard_widgets").upsert(rows, { onConflict: "user_id,widget_key" });
    if (error) return fail(explain(error.message));
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
