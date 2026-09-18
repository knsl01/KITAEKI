# KITA — Eki & Dinda

Aplikasi keuangan bersama: catat pemasukan, pengeluaran, dan transfer antar akun; atur anggaran per kategori; kejar target tabungan; lihat laporan arus kas.

Stack: Next.js 15.5 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth + Postgres) · Recharts · Lucide.

## Jalankan lokal

```bash
npm install
cp .env.example .env
# isi kredensial Supabase di .env
npm run dev
```

Buka http://localhost:3000.

## Environment

| Variabel | Keterangan |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key |

Service-role key tidak dipakai di mana pun dan tidak boleh ditaruh di project ini. Semua akses data lewat anon key + Row Level Security.

## Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan `supabase/migrations/0001_init.sql`, lalu `supabase/migrations/0002_household.sql` (urut).
3. **Authentication → Providers → Email**: aktifkan. Untuk pemakaian pribadi, matikan "Confirm email" supaya akun langsung bisa dipakai.
4. **Authentication → URL Configuration**: isi Site URL dengan domain Vercel kamu.
5. Salin Project URL dan anon key ke `.env`.

Migrasi tersebut membuat tabel, index, trigger sinkronisasi saldo, dan policy RLS. Setiap user baru otomatis dapat profil dan satu set kategori awal.

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import repo di Vercel (framework terdeteksi otomatis sebagai Next.js).
3. Tambahkan dua environment variable di atas untuk Production, Preview, dan Development.
4. Deploy.

## Model data

| Tabel | Isi |
| --- | --- |
| `profiles` | Nama tampilan dan pemilik default transaksi |
| `accounts` | Rekening, e-wallet, tunai, beserta saldonya |
| `categories` | Kategori pemasukan dan pengeluaran |
| `transactions` | Pemasukan, pengeluaran, transfer |
| `budgets` | Batas belanja per kategori per bulan |
| `savings_goals` | Target tabungan dan progresnya |
| `recurring_transactions` | Tagihan atau pemasukan rutin |

Semua tabel memakai UUID, timestamp, foreign key, index, dan RLS berbasis `auth.uid()`.

## Aturan perhitungan

- Pemasukan menambah saldo akun.
- Pengeluaran mengurangi saldo akun.
- Transfer memindahkan dana antar akun dan tidak dihitung sebagai pemasukan maupun pengeluaran.
- Tabungan bulan ini = pemasukan − pengeluaran.

Saldo akun dihitung di database lewat trigger, jadi tetap sinkron saat transaksi ditambah, diubah, atau dihapus — termasuk kalau datanya diedit langsung dari Supabase.

## Tema

Tersedia empat tema: **Sage** (default), **Deep purple**, **Deep blue**, dan **Burgundy** — masing-masing punya versi terang dan gelap, plus mode mengikuti sistem. Ganti lewat ikon palet di header atau kartu Tema di halaman Pengaturan.

Status fitur dan apa yang belum dikerjakan ada di `ROADMAP.md`.

Semua warna didefinisikan sebagai CSS variable di `src/app/globals.css`, termasuk warna grafik, jadi menambah tema baru cukup menambah satu blok `[data-theme="..."]` dan satu entri di `THEMES` pada `src/components/theme-provider.tsx`.

Pilihan tema disimpan di `localStorage` browser masing-masing (bukan di database), supaya Eki dan Dinda bisa pakai tema berbeda di perangkat masing-masing. Sebuah script kecil di `<head>` memasang tema sebelum halaman digambar, jadi tidak ada kedip warna saat memuat.

## Animasi

Transisi halaman, kemunculan kartu berurutan, serta efek hover pada ikon, tombol, kartu, dan baris tabel didefinisikan sebagai utility di `globals.css`. Semuanya otomatis dimatikan kalau perangkat mengaktifkan *reduce motion*.

## Keamanan dependensi

`npm audit --omit=dev` bersih. `postcss` dikunci lewat field `overrides` di `package.json` supaya versi bawaan Next ikut naik ke versi yang sudah ditambal — jangan hapus field itu tanpa mengecek audit ulang.

## Struktur

```
src/app/actions      server actions (CRUD + auth)
src/app/dashboard    halaman aplikasi
src/components       komponen UI dan tampilan per halaman
src/lib              supabase client, helper format, agregasi
src/components/theme-provider.tsx  definisi dan penyimpanan tema
supabase/migrations  skema database
```
