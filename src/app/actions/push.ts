"use server";

import webpush from "web-push";
import { getUserClient, fail, type ActionResult } from "./_shared";

// Set VAPID details
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:hello@kita.app";
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidSubject && vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
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

// ----- Types -----

export type PushTestResult = {
  ok: boolean;
  message: string;
  sent?: number;
  failed?: number;
};

// ----- Test push -----

export async function sendTestPush(): Promise<PushTestResult> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return { ok: false, message: "VAPID keys tidak dikonfigurasi di .env.local" };
  }

  const { supabase, user, householdId } = await getUserClient();
  if (!user || !householdId) return { ok: false, message: "Unauthorized" };

  // Kirim hanya ke device milik user sendiri
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", user.id);

  if (error) return { ok: false, message: error.message };
  if (!subs || subs.length === 0)
    return { ok: false, message: "Tidak ada langganan aktif untuk akun ini. Aktifkan notifikasi terlebih dahulu." };

  const payload = JSON.stringify({
    title: "🔔 Test Notifikasi",
    body: "Notifikasi push berhasil! Kita siap pakai.",
    url: "/",
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Error sending test push:", err);
        }
      }
    })
  );

  if (sent > 0) return { ok: true, message: `Test berhasil dikirim ke ${sent} perangkat.`, sent, failed };
  return { ok: false, message: "Gagal mengirim test ke semua perangkat.", sent, failed };
}

// ----- Unsubscribe -----

export async function unsubscribeFromPush(endpoint: string): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail("Unauthorized");

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return fail(error.message);
  return { ok: true };
}
