"use server";

import webpush from "web-push";
import { getUserClient, fail, type ActionResult } from "./_shared";

// Set VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:hello@kita.app", // ganti dengan email admin
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function subscribeToPush(subscription: any): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user || !householdId) return fail("Unauthorized");

  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return fail("Invalid subscription");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      household_id: householdId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return fail(error.message);
  return { ok: true };
}

export async function sendPushNotification(
  householdId: string,
  excludeUserId: string,
  title: string,
  body: string,
  url: string = "/"
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys not configured. Cannot send push notification.");
    return;
  }

  const { supabase } = await getUserClient();
  
  // Ambil semua subscription dari anggota household lain
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("household_id", householdId)
    .neq("user_id", excludeUserId);

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({ title, body, url });

  const promises = subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired or unsubscribed, hapus dari db
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("Error sending push notification:", err);
      }
    }
  });

  await Promise.all(promises);
}
