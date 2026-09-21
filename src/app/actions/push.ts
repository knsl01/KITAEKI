"use server";

/**
 * Server action untuk langganan notifikasi. Yang diekspor di sini otomatis menjadi endpoint
 * publik, jadi hanya fungsi yang aman dipanggil klien dan selalu bekerja atas nama user login.
 * Fungsi pengirim notifikasi ke household ada di "@/lib/push" (bukan server action).
 */
import { getUserClient, fail, UNAUTH, NO_HOUSEHOLD, type ActionResult } from "./_shared";
import { ensureVapid, notifySelfOnly } from "@/lib/push";

type BrowserSubscription = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function subscribeToPush(subscription: BrowserSubscription, userAgent?: string): Promise<ActionResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!householdId) return fail(NO_HOUSEHOLD);

  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) return fail("Data langganan dari browser tidak lengkap.");

  // RPC (SECURITY DEFINER) supaya perangkat yang sama bisa pindah pemilik saat ganti akun Eki ↔ Dinda.
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_user_agent: (userAgent ?? "").slice(0, 300) || null,
  });

  if (error) {
    const missing = /save_push_subscription|schema cache|does not exist/i.test(error.message);
    return fail(
      missing
        ? "Database belum siap untuk notifikasi. Jalankan supabase/migrations/0005_push_notifications.sql di Supabase SQL Editor."
        : error.message
    );
  }
  return { ok: true };
}

export async function unsubscribeFromPush(endpoint: string): Promise<ActionResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return fail(UNAUTH);
  if (!endpoint) return { ok: true };

  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  if (error) return fail(error.message);
  return { ok: true };
}

export type PushTestResult = {
  ok: boolean;
  message: string;
  sent: number;
  total: number;
};

/** Kirim notifikasi ke perangkat milik user ini dan laporkan hasilnya apa adanya (untuk diagnosis). */
export async function sendTestPush(): Promise<PushTestResult> {
  const { supabase, user, householdId } = await getUserClient();
  if (!user || !householdId) return { ok: false, message: UNAUTH, sent: 0, total: 0 };

  const vapid = ensureVapid();
  if (!vapid.ok) {
    return {
      ok: false,
      sent: 0,
      total: 0,
      message: `${vapid.reason} Isi di Vercel → Settings → Environment Variables (tanpa tanda kutip), lalu Redeploy.`,
    };
  }

  const result = await notifySelfOnly(
    { supabase, userId: user.id, householdId },
    {
      title: "Notifikasi KITA aktif ✅",
      body: "Kalau kamu membaca ini, notifikasi di perangkat ini sudah berjalan.",
      url: "/dashboard/settings",
      tag: "kita-test",
    }
  );

  if (result.subscriptionError) return { ok: false, sent: 0, total: 0, message: result.subscriptionError };

  if (result.total === 0) {
    return {
      ok: false,
      sent: 0,
      total: 0,
      message: "Perangkat ini belum terdaftar di server. Tekan “Aktifkan notifikasi” dulu, lalu coba lagi.",
    };
  }

  if (result.sent === 0) {
    const reason = result.removed
      ? "Langganan lama sudah kedaluwarsa dan dihapus. Nonaktifkan lalu aktifkan ulang notifikasi."
      : result.errors.join("; ") || "Push service menolak pengiriman.";
    return { ok: false, sent: 0, total: result.total, message: reason };
  }

  return {
    ok: true,
    sent: result.sent,
    total: result.total,
    message: `Terkirim ke ${result.sent} perangkat.`,
  };
}
