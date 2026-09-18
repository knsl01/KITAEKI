"use server";

import { revalidatePath } from "next/cache";
import {
  fail,
  getUserClient,
  OWNER_KEYS,
  optionalNum,
  optionalStr,
  pick,
  safeUrl,
  str,
  NO_HOUSEHOLD,
  UNAUTH,
  type ActionResult,
} from "./_shared";

const PRIORITIES = ["low", "medium", "high"] as const;

function readFields(formData: FormData) {
  const name = str(formData, "name");
  const price = optionalNum(formData, "price");
  const rawUrl = str(formData, "url");
  const url = safeUrl(formData, "url");

  if (!name) return { ok: false, error: "Nama barang wajib diisi." } as const;
  if (price !== null && price < 0) return { ok: false, error: "Harga tidak boleh negatif." } as const;
  if (rawUrl && !url) return { ok: false, error: "Tautan tidak valid. Pakai alamat http atau https." } as const;

  return {
    ok: true,
    values: {
      name,
      price,
      url,
      priority: pick(formData, "priority", PRIORITIES, "medium"),
      owner: pick(formData, "owner", OWNER_KEYS, "shared"),
      notes: optionalStr(formData, "notes"),
    },
  } as const;
}

export async function createWishlistItem(formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const fields = readFields(formData);
  if (!fields.ok) return fail(fields.error);

  const { error } = await supabase
    .from("wishlist_items")
    .insert({ household_id: householdId, created_by: user.id, ...fields.values });
  if (error) return fail(error.message);

  revalidatePath("/dashboard/wishlist");
  return { ok: true };
}

export async function updateWishlistItem(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const fields = readFields(formData);
  if (!fields.ok) return fail(fields.error);

  const { error } = await supabase.from("wishlist_items").update(fields.values).eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard/wishlist");
  return { ok: true };
}

export async function toggleWishlistPurchased(id: string, purchased: boolean): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase
    .from("wishlist_items")
    .update({ is_purchased: purchased, purchased_on: purchased ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard/wishlist");
  return { ok: true };
}

export async function deleteWishlistItem(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase.from("wishlist_items").delete().eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard/wishlist");
  return { ok: true };
}
