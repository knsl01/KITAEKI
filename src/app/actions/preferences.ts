"use server";

import { revalidatePath } from "next/cache";
import { fail, getUserClient, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";

const THEMES = ["sage", "deep-purple", "deep-blue", "nebula", "burgundy", "ocean", "honey", "graphite", "blackpink", "midnight-rose", "matcha", "amethyst-night"] as const;
const MODES = ["light", "dark", "system"] as const;
const RADII = ["sharp", "soft", "round"] as const;
const MOBILE_NAV_PATHS = ["/dashboard", "/dashboard/ai", "/dashboard/transactions", "/dashboard/accounts", "/dashboard/finance", "/dashboard/savings", "/dashboard/recurring", "/dashboard/calendar", "/dashboard/routes", "/dashboard/shopping", "/dashboard/budget", "/dashboard/categories", "/dashboard/wishlist", "/dashboard/share", "/dashboard/settings"] as const;

type UserPreferencesRecord = {
  user_id: string;
  theme: string | null;
  mode: string | null;
  radius: string | null;
  positive_color: string | null;
  negative_color: string | null;
  mobile_nav: string[] | null;
  updated_at: string | null;
};

export async function getUserPreferences(): Promise<UserPreferencesRecord | null> {
  const { supabase, user } = await getUserClient();
  if (!user) return null;
  const { data } = await supabase.from("user_preferences").select("user_id, theme, mode, radius, positive_color, negative_color, mobile_nav, updated_at").eq("user_id", user.id).maybeSingle();
  return (data ?? null) as UserPreferencesRecord | null;
}

export async function saveUserPreferences(input: { theme?: string; mode?: string; radius?: string; positiveColor?: string | null; negativeColor?: string | null; mobileNav?: string[] }): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);
  const theme = THEMES.includes(input.theme as (typeof THEMES)[number]) ? input.theme : undefined;
  const mode = MODES.includes(input.mode as (typeof MODES)[number]) ? input.mode : undefined;
  const radius = RADII.includes(input.radius as (typeof RADII)[number]) ? input.radius : undefined;
  const colorPattern = /^\d{1,3} \d{1,3}% \d{1,3}%$/;
  const positiveColor = input.positiveColor === null || (typeof input.positiveColor === "string" && colorPattern.test(input.positiveColor)) ? input.positiveColor : undefined;
  const negativeColor = input.negativeColor === null || (typeof input.negativeColor === "string" && colorPattern.test(input.negativeColor)) ? input.negativeColor : undefined;
  let mobileNav: string[] | undefined;
  if (input.mobileNav !== undefined) {
    if (!Array.isArray(input.mobileNav) || input.mobileNav.length < 1 || input.mobileNav.length > 4 || input.mobileNav.some((path) => !MOBILE_NAV_PATHS.includes(path as (typeof MOBILE_NAV_PATHS)[number])) || new Set(input.mobileNav).size !== input.mobileNav.length) {
      return fail("Pilih 1 sampai 4 halaman unik untuk bar HP.");
    }
    mobileNav = input.mobileNav;
  }
  const { error } = await supabase.from("user_preferences").upsert({ user_id: user.id, ...(theme ? { theme } : {}), ...(mode ? { mode } : {}), ...(radius ? { radius } : {}), ...(positiveColor !== undefined ? { positive_color: positiveColor } : {}), ...(negativeColor !== undefined ? { negative_color: negativeColor } : {}), ...(mobileNav !== undefined ? { mobile_nav: mobileNav } : {}), updated_at: new Date().toISOString() });
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}
