# Perubahan: notifikasi, ikon full, Share Story

## Yang WAJIB dilakukan setelah deploy
1. **Supabase → SQL Editor**: jalankan `supabase/migrations/0005_push_notifications.sql` (aman diulang).
2. **Vercel → Settings → Environment Variables** (Production), *tanpa tanda kutip*, lalu **Redeploy**:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (isi sama seperti `.env.local`)
   - opsional `NEXT_PUBLIC_APP_URL` (alamat di QR; default `https://kind.knsl.tech`)
   - opsional `PUSH_NOTIFY_SELF=false` kalau notifikasi hanya untuk pasangan (default: semua perangkat termasuk pelaku)
3. Di **setiap perangkat & tiap akun**: Pengaturan → Notifikasi → *Aktifkan notifikasi* → *Kirim notifikasi tes*.
4. iPhone: hapus ikon KITA lama dari Layar Utama, buka lewat Safari, **Tambah ke Layar Utama** ulang (iOS menyimpan ikon lama), buka dari ikon itu, baru aktifkan notifikasi.

## Akar masalah notifikasi
- RLS `push_subscriptions` hanya membolehkan baca langganan milik sendiri → server tidak pernah menemukan langganan pasangan (dan pelaku dikecualikan) → tidak ada yang terkirim.
- `sendPushNotification` ada di file `"use server"` → terbuka sebagai endpoint publik. Dipindah ke `src/lib/push.ts`.
- Notifikasi hanya dipanggil dari transaksi & AI; tabungan, tugas, belanja, wishlist, akun, recurring tidak.
- SW hanya didaftarkan di halaman Pengaturan; ikon SW mengarah ke file yang tidak ada; klik notifikasi tidak fokus ke jendela yang sudah terbuka; push non-JSON tidak menampilkan apa pun (iOS mencabut izin).
- iPhone di Safari biasa tidak punya Push API → UI dulu hanya bilang "tidak didukung"; kini ada panduan pasang ke Layar Utama.
- `ai-tools.ts` menulis kolom `created_by` ke `transactions`/`savings_goals` (yang tidak ada) → transaksi via KITA AI gagal. Diperbaiki ke `user_id`.
- Link menu "Calendar KITA" mengarah ke `/dashboard/tasks` (404); folder aslinya `calendar`. Diperbaiki.

## Ikon
`public/icon.jpg` adalah squircle di atas latar hitam. Kini semua ikon PNG full-bleed (tanpa hitam), opak untuk iOS; `maskable` dengan logo di zona aman; `badge-96.png` siluet putih untuk notifikasi. Manifest ganda dilebur ke `src/app/manifest.ts`.

## Share Story
Ditulis ulang dengan Canvas (hasil PNG 1080×1920 / 1080×1350 sama persis dengan pratinjau, bisa Bagikan/Simpan):
13 desain × 10 warna × 3 gaya kartu × 6 pola × 2 ukuran, opsi sembunyikan nominal, foto latar, teks kustom, tombol Acak.
QR dibuat lokal (`src/lib/share/qr.ts`), tidak lagi memakai layanan luar.

## Halaman Masuk / Daftar (baru)
- `src/components/auth/` — `auth-experience.tsx` (tata letak + teks yang berganti antara Masuk dan Daftar), `auth-card.tsx` (form), `aurora-canvas.tsx` (latar hidup), `auth.css` (semua gaya, berawalan `.kx-`).
- Tema deep blue × deep purple. Latar Canvas: aurora bergerak, bintang yang tertarik ke kursor/jari, garis rasi, bintang jatuh, dan dua bola cahaya (Eki biru, Dinda ungu) yang mengorbit kartu; di mode Daftar keduanya berjalan berdampingan, saat mengetik/kirim menyala, saat akun berhasil dibuat meledak jadi kilau.
- Teks hero berubah saat pindah ke Daftar (judul, deskripsi, 3 langkah mulai, kutipan). Di desktop tampil widget melayang (saldo, target, notifikasi) yang bergeser mengikuti kursor.
- Form: label mengambang, kekuatan password, peringatan Caps Lock, tombol dengan ripple, getar saat error, panel sukses setelah daftar. Nilai isian tidak hilang saat login gagal.
- Menghormati `prefers-reduced-motion` (tanpa animasi, tampilan tetap utuh). `auth-form.tsx` dan `login-scene.tsx` lama dihapus.
