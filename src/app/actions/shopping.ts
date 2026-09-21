"use server";

import { revalidatePath } from "next/cache";
import {
  fail,
  getUserClient,
  OWNER_KEYS,
  optionalNum,
  optionalStr,
  pick,
  str,
  NO_HOUSEHOLD,
  UNAUTH,
  type ActionResult,
} from "./_shared";
import { pushActivity } from "@/lib/push";

export async function createShoppingItem(formData: FormData): Promise<ActionResult> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const name = str(formData, "name");
  if (!name) return fail("Nama barang wajib diisi.");

  const estimated_price = optionalNum(formData, "estimated_price");
  if (estimated_price !== null && estimated_price < 0) return fail("Perkiraan harga tidak boleh negatif.");

  const { error } = await supabase.from("shopping_items").insert({
    household_id: householdId,
    created_by: user.id,
    assigned_to: pick(formData, "assigned_to", OWNER_KEYS, "shared"),
    name,
    quantity: optionalStr(formData, "quantity"),
    estimated_price,
  });
  if (error) return fail(error.message);

  await pushActivity(session, ({ who }) => ({
    title: "🛒 Belanja baru",
    body: `${who} menambahkan “${name}” ke daftar belanja`,
    url: "/dashboard/shopping",
  }));

  revalidatePath("/dashboard/shopping");
  return { ok: true };
}

export async function toggleShoppingItem(id: string, bought: boolean): Promise<ActionResult> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase
    .from("shopping_items")
    .update({ is_bought: bought })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return fail(error.message);

  if (bought) {
    await pushActivity(session, ({ who }) => ({ title: "🛍️ Sudah dibeli", body: `${who} menandai satu barang sudah dibeli`, url: "/dashboard/shopping" }));
  }

  revalidatePath("/dashboard/shopping");
  return { ok: true };
}

export async function deleteShoppingItem(id: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase.from("shopping_items").delete().eq("id", id).eq("household_id", householdId);
  if (error) return fail(error.message);

  revalidatePath("/dashboard/shopping");
  return { ok: true };
}

export async function clearBoughtShopping(): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const { error } = await supabase.from("shopping_items").delete().eq("household_id", householdId).eq("is_bought", true);
  if (error) return fail(error.message);

  revalidatePath("/dashboard/shopping");
  return { ok: true };
}
