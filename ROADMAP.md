# Status implementasi

## Sudah jalan (pass ini)

- **Workspace bersama.** Tabel `households` + `household_members`. Semua tabel lama dapat `household_id`, RLS ditulis ulang jadi berbasis household lewat fungsi `current_household_id()`. Eki dan Dinda login sendiri-sendiri, data sama, household lain tidak bisa mengintip.
- **Kode undangan.** Pasangan daftar akun sendiri lalu masukkan kode di Pengaturan. RPC `join_household` sekalian memindahkan data yang sudah terlanjur dibuat.
- **Switcher Bersama / Eki / Dinda** di banner dashboard, menyaring saldo, transaksi, dan target.
- **Banner dashboard** dengan foto yang bisa diunggah sendiri plus sapaan, kalimat, dan kutipan yang bisa diedit.
- **Ikon, bukan emoji.** Registry ikon kategori (lucide) dengan tebakan otomatis dari nama, plus penanda bank/e-wallet Indonesia. Ada pemilih ikon di form akun dan kategori.
- **Tema.** Sage, Deep purple, Deep blue, Burgundy — masing-masing punya versi terang dan gelap, plus mode "ikut sistem".
- **Sidebar bisa diciutkan** dengan animasi, dan lebar konten mengikuti.
- **Bottom nav melayang** di mobile, dengan label yang melebar saat aktif dan tombol tambah transaksi menempel.
- **PWA + ikon iOS.** `manifest.webmanifest`, `apple-touch-icon.png`, ikon maskable. Bisa "Add to Home Screen" di iPhone.
- **Login baru** dengan lanskap SVG berlapis yang bergeser mengikuti kursor.
- **Storage** bucket `kita-media`, ditulis per folder household.
- Skema database untuk seluruh modul kehidupan bersama sudah dibuat (lihat di bawah), tinggal UI-nya.

- **Kartu Total Saldo baru** di dashboard: saldo asli sebagai fokus, perubahan bulan ini (+/−), ringkasan
  pemasukan/pengeluaran, deretan penanda akun, dan grafik riwayat saldo yang halus dengan pemilih 7D / 1M / 3M / 1Y.
  Riwayat saldo **dihitung mundur** dari saldo akun sekarang + transaksi (aturannya sama dengan trigger SQL),
  jadi tidak perlu tabel baru. Logikanya ada di `src/lib/balance-history.ts` dan sudah diuji terhadap simulasi acak.
- **Tugas, Belanja, Wishlist**: tiga layar pertama dari modul kehidupan bersama (`tasks`, `shopping_items`,
  `wishlist_items`), lengkap dengan aksi server, saringan Eki/Dinda/Bersama, dan navigasinya.

- **Dashboard widget yang bisa diatur** (`0003_dashboard_widgets.sql`). Tombol **Atur widget** di banner membuka mode atur:
  - **Tambah / sembunyikan** widget dari daftar 12 widget (Total saldo, Pemasukan, Pengeluaran, Tabungan, Pemasukan vs
    pengeluaran, Saldo per akun, Kategori, Target tabungan, Tugas, Transaksi terbaru, Daftar belanja, Wishlist).
  - **Ukuran**: lebar ¼ / ⅓ / ½ / ⅔ / penuh dan tinggi 1–3 baris, lewat tombol atau dengan menarik pojok widget.
    Pilihan yang boleh dipakai berbeda per widget (`src/lib/widgets.ts`).
  - **Geser** untuk menukar tempat (mouse, sentuh, atau tombol panah di keyboard); widget lain meluncur ke tempat barunya.
  - Susunan tersimpan **per user** di `dashboard_widgets`, jadi Eki dan Dinda boleh punya susunan sendiri.
  - Isi widget menyesuaikan ukurannya (jumlah baris daftar, tata letak grafik), bukan sekadar terpotong.
  - Layar tablet memakai dua kolom, ponsel satu kolom (ukuran ¼ berdampingan dua-dua).
- **Kartu Total saldo**: latar bisa diganti foto sendiri (ikon gambar di kepala kartu, dengan pengatur kegelapan foto),
  tanpa foto latarnya cahaya lembut mengikuti tema. Saat dikecilkan jadi kartu ringkas (angka + lengkung tipis) sehingga
  2–3 widget lain muat di sebelahnya. Foto disimpan di `dashboard_widgets.config` milik user.
- **Grafik baru** (SVG buatan sendiri, tanpa Recharts di dashboard): batang pemasukan/pengeluaran dengan sorotan bulan,
  legenda yang bisa dimatikan, donut kategori yang saling terhubung dengan daftarnya, sparkline yang bisa disentuh,
  cincin persentase tabungan, dan grafik saldo dengan garis acuan awal periode.
- **Gaya tampilan** (ikon palet di topbar dan di Pengaturan): 8 tema (tambahan Ocean, Honey, Graphite, Black Pink) dan
  3 tingkat kebulatan sudut. Berlaku langsung dan tersimpan per browser.
- **Tema Black Pink**: hitam dan pink neon. Angka pemasukan (hijau di tema lain) jadi hitam di mode terang dan putih di
  mode gelap; angka pengeluaran (merah) jadi pink. Semua garis grafik pink neon dengan cahaya berlapis, dan titik di
  ujung grafik berkedip halus. Efeknya hanya aktif di tema ini (`.chart-glow`, `.chart-dot` di `globals.css`) dan
  berhenti kalau perangkat memakai "kurangi gerakan".
- **Area aman iPhone**: saat dibuka dari layar utama (layar penuh), topbar turun di bawah notch/Dynamic Island dan area
  status bar diberi warna gelap supaya jam dan baterai terbaca. Di Safari biasa tampilannya tidak berubah.
- **Tipografi satu keluarga**: seluruh aplikasi memakai **Plus Jakarta Sans** lewat `next/font/google` (bobot 400–800,
  tanpa file huruf manual). Judul 700–800 dan rapat, tombol 600, angka uang 600–700 dengan angka lurus dan sama lebar
  (`.tabular`, `.numeral` di `globals.css`). Kelas lama `font-serif` tetap ada tetapi kini berarti "judul" dalam huruf yang sama.
- **Warna angka** hijau (pemasukan) dan merah (pengeluaran) dibuat lebih pekat di semua tema, terang maupun gelap.
- **Menu di HP**: tombol **Menu** di topbar dan ikon menu di bar bawah membuka sidebar yang meluncur dari kiri
  (isinya sama dengan sidebar desktop, termasuk Keluar). Sebelumnya 9 halaman tidak terjangkau dari HP.
- **Kolom nominal berformat titik ribuan** (`MoneyInput`): mengetik 2000000 tampil "Rp 2.000.000". Server tetap menerima
  angka polos, jadi validasi dan penyimpanan tidak berubah. Dipakai di transaksi, akun, anggaran, berulang,
  target/tabungan, wishlist, dan belanja.

## Tabel yang sudah ada tapi belum ada layarnya

`life_goals`, `trips`, `trip_items`, `places`, `calendar_events`, `date_ideas`, `gift_ideas`,
`notes`, `memories`, `dashboard_widgets`.

Semuanya sudah ber-RLS household, sudah punya kolom `owner` (Eki/Dinda/Bersama), dan sudah
punya foreign key penghubung: `trips.savings_goal_id`, `wishlist_items.savings_goal_id`,
`places.trip_id`, `memories.trip_id`, `calendar_events.trip_id`. Jadi rantai
Trip → Target tabungan → Anggaran → Transaksi tinggal dirangkai di UI.

Catatan privasi yang sudah dipasang: `gift_ideas` hanya terbaca oleh pembuatnya (biar tetap
kejutan), dan `notes` bisa ditandai privat.

## Belum dikerjakan

1. Layar untuk 10 modul di atas (Trip → Target tabungan → Anggaran → Transaksi adalah yang paling bernilai).
2. Widget untuk modul yang belum punya layar (Trip, Kalender, Catatan, Kenangan) — cukup tambah entri di
   `src/lib/widgets.ts` dan satu komponen; papan, penyimpanan, dan mode atur otomatis ikut.
3. KITA AI — panel asisten. Tempat pasang model menyusul.
4. Ekspor laporan ke Excel dan Google Sheets.
5. Merapikan halaman Keuangan, Anggaran, Laporan mengikuti tampilan dashboard yang baru.

## Urutan pasang migrasi

```
supabase/migrations/0001_init.sql      -- skema awal
supabase/migrations/0002_household.sql -- workspace bersama + modul baru
supabase/migrations/0003_dashboard_widgets.sql -- kolom ukuran dan konfigurasi widget
```

Jalankan `0002` lalu `0003` di SQL Editor Supabase. Keduanya aman dijalankan berulang; `0002` otomatis
membuatkan household untuk akun yang sudah ada. Tanpa `0003`, dashboard tetap tampil dengan susunan bawaan,
tetapi menyimpan susunan dan latar kartu akan menampilkan pesan agar migrasi dijalankan.
