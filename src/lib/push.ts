/**
 * Helper Web Push sisi server.
 *
 * SENGAJA bukan file "use server": fungsi di sini tidak boleh jadi endpoint yang bisa dipanggil
 * sembarang klien. Hanya di-import oleh server action lain (transaksi, tabungan, dst.), dan
 * `householdId` selalu berasal dari sesi login — bukan dari argumen klien.
 *
 * Alur:  aksi user → notifyHousehold() → RPC household_push_subscriptions() → web-push → FCM / Mozilla / APNs (iOS).
 */
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PushPayload = {
  title: string;
  body: string;
  /** Halaman yang dibuka saat notifikasi diketuk. */
  url?: string;
  /** Notifikasi dengan tag sama saling menggantikan. Kosongkan kalau tiap notifikasi harus terlihat. */
  tag?: string;
};

export type PushContext = {
  supabase: SupabaseClient;
  userId: string;
  householdId: string;
};

export type PushResult = {
  configured: boolean;
  total: number;
  sent: number;
  failed: number;
  removed: number;
  /** Ringkasan kegagalan, aman ditampilkan ke user (tanpa kunci). */
  errors: string[];
};

type SubRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

/* ── konfigurasi VAPID ─────────────────────────────────── */

/** Kalau env diisi dengan tanda kutip (kesalahan umum di dashboard Vercel), kutipnya dibuang. */
function clean(value: string | undefined) {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

export function ensureVapid(): { ok: true } | { ok: false; reason: string } {
  const subject = clean(process.env.VAPID_SUBJECT) || "mailto:hello@kita.app";
  const publicKey = clean(process.env.VAPID_PUBLIC_KEY) || clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const privateKey = clean(process.env.VAPID_PRIVATE_KEY);

  if (!publicKey) return { ok: false, reason: "VAPID_PUBLIC_KEY belum diisi di environment server." };
  if (!privateKey) return { ok: false, reason: "VAPID_PRIVATE_KEY belum diisi di environment server." };

  try {
    // setVapidDetails melempar error kalau format kunci / subject salah — kita ubah jadi pesan jelas.
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `Kunci VAPID tidak valid: ${(err as Error).message}` };
  }
}

/* ── pengiriman ────────────────────────────────────────── */

function describeError(err: unknown) {
  const e = err as { statusCode?: number; body?: string; message?: string };
  if (e?.statusCode) {
    const hint =
      e.statusCode === 401 || e.statusCode === 403
        ? " (kunci VAPID ditolak push service — pastikan kunci publik di browser sama dengan yang dipakai server, lalu daftar ulang notifikasi)"
        : e.statusCode === 413
          ? " (payload terlalu besar)"
          : "";
    return `HTTP ${e.statusCode}${hint}`;
  }
  return e?.message ?? "error tidak diketahui";
}

/** Kirim ke daftar langganan. Tidak pernah melempar error. Langganan mati (404/410) ikut dibersihkan. */
export async function deliver(
  supabase: SupabaseClient,
  subs: SubRow[],
  payload: PushPayload
): Promise<PushResult> {
  const result: PushResult = { configured: true, total: subs.length, sent: 0, failed: 0, removed: 0, errors: [] };

  const vapid = ensureVapid();
  if (!vapid.ok) {
    result.configured = false;
    result.errors.push(vapid.reason);
    return result;
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
    tag: payload.tag,
  });

  const dead: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          // urgency high = langsung dikirim (penting di iOS/Android yang menahan push berprioritas rendah).
          { TTL: 60 * 60 * 24, urgency: "high" }
        );
        result.sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          dead.push(sub.id);
        } else {
          result.failed += 1;
          const msg = describeError(err);
          if (!result.errors.includes(msg)) result.errors.push(msg);
          console.error("[push] gagal kirim:", msg);
        }
      }
    })
  );

  if (dead.length) {
    result.removed = dead.length;
    const { error } = await supabase.rpc("delete_push_subscriptions", { p_ids: dead });
    if (error) console.error("[push] gagal hapus langganan mati:", error.message);
  }

  return result;
}

async function loadSubscriptions(supabase: SupabaseClient): Promise<{ subs: SubRow[]; error?: string }> {
  const { data, error } = await supabase.rpc("household_push_subscriptions");
  if (error) {
    const missing = /household_push_subscriptions|schema cache|does not exist/i.test(error.message);
    return {
      subs: [],
      error: missing
        ? "Fungsi database belum ada. Jalankan supabase/migrations/0005_push_notifications.sql di Supabase SQL Editor."
        : error.message,
    };
  }
  return { subs: (data ?? []) as SubRow[] };
}

/**
 * Kirim notifikasi ke seluruh anggota household (termasuk perangkat si pelaku, supaya
 * kamu bisa langsung melihat hasilnya saat mencoba sendiri). Set PUSH_NOTIFY_SELF=false
 * kalau hanya ingin pasangan yang diberi tahu.
 */
export async function notifyHousehold(ctx: PushContext, payload: PushPayload): Promise<PushResult> {
  const empty: PushResult = { configured: true, total: 0, sent: 0, failed: 0, removed: 0, errors: [] };
  try {
    const includeSelf = clean(process.env.PUSH_NOTIFY_SELF).toLowerCase() !== "false";
    const { subs, error } = await loadSubscriptions(ctx.supabase);
    if (error) {
      console.error("[push]", error);
      return { ...empty, errors: [error] };
    }
    const targets = includeSelf ? subs : subs.filter((s) => s.user_id !== ctx.userId);
    if (targets.length === 0) return empty;
    return await deliver(ctx.supabase, targets, payload);
  } catch (err) {
    console.error("[push] tak terduga:", err);
    return { ...empty, errors: [(err as Error).message] };
  }
}

/** Kirim hanya ke perangkat milik user ini (untuk tombol "Kirim notifikasi tes"). */
export async function notifySelfOnly(ctx: PushContext, payload: PushPayload): Promise<PushResult & { subscriptionError?: string }> {
  const { subs, error } = await loadSubscriptions(ctx.supabase);
  if (error) {
    return { configured: true, total: 0, sent: 0, failed: 0, removed: 0, errors: [error], subscriptionError: error };
  }
  return deliver(
    ctx.supabase,
    subs.filter((s) => s.user_id === ctx.userId),
    payload
  );
}

/* ── util pesan ────────────────────────────────────────── */

export function rupiah(value: number) {
  const n = Math.round(Number(value) || 0);
  return "Rp" + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Nama panggilan pelaku untuk isi notifikasi ("Eki", "Dinda"). */
export async function actorName(ctx: PushContext, memberKey?: string) {
  const { data } = await ctx.supabase.from("profiles").select("full_name").eq("id", ctx.userId).maybeSingle();
  const full = (data?.full_name as string | null | undefined)?.trim();
  if (full) return full.split(/\s+/)[0];
  if (memberKey === "eki") return "Eki";
  if (memberKey === "dinda") return "Dinda";
  return "Pasangan";
}

/** Sesi yang sudah dimiliki tiap server action (hasil getUserClient). */
type Session = {
  supabase: SupabaseClient;
  user: { id: string } | null;
  householdId: string | null;
  memberKey?: string;
};

/**
 * Jalan pintas untuk server action. Dipakai seperti:
 *
 *   const session = await getUserClient();
 *   ...insert ke database...
 *   await pushActivity(session, ({ who }) => ({ title: "Tugas baru", body: `${who} menambah ...` }));
 *
 * Tidak pernah melempar error, jadi kegagalan notifikasi tidak akan menggagalkan aksi utama.
 */
export async function pushActivity(session: Session, build: (info: { who: string }) => PushPayload | null) {
  try {
    const { supabase, user, householdId, memberKey } = session;
    if (!user || !householdId) return;
    const ctx: PushContext = { supabase, userId: user.id, householdId };
    const who = await actorName(ctx, memberKey);
    const payload = build({ who });
    if (!payload) return;
    await notifyHousehold(ctx, payload);
  } catch (err) {
    console.error("[push] pushActivity:", err);
  }
}
