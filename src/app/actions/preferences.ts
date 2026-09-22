"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

const THEMES = ["sage", "deep-purple", "deep-blue", "nebula", "burgundy", "ocean", "honey", "graphite", "blackpink", "midnight-rose", "matcha", "amethyst-night"] as const;
const MODES = ["light", "dark", "system"] as const;
const RADII = ["sharp", "soft", "round"] as const;

export async function getUserPreferences() {
  const { supabase, user } = await getUserClient();
  if (!user) return null;
  const { data } = await supabase.from("user_preferences").select("theme, mode, radius").eq("user_id", user.id).maybeSingle();
  return data;
}

export async function saveUserPreferences(input: { theme?: string; mode?: string; radius?: string }): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);
  const theme = THEMES.includes(input.theme as (typeof THEMES)[number]) ? input.theme : undefined;
  const mode = MODES.includes(input.mode as (typeof MODES)[number]) ? input.mode : undefined;
  const radius = RADII.includes(input.radius as (typeof RADII)[number]) ? input.radius : undefined;
  const { error } = await supabase.from("user_preferences").upsert({ user_id: user.id, ...(theme ? { theme } : {}), ...(mode ? { mode } : {}), ...(radius ? { radius } : {}), updated_at: new Date().toISOString() });
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}
