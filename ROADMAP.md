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

## Tabel yang sudah ada tapi belum ada layarnya

`wishlist_items`, `life_goals`, `trips`, `trip_items`, `places`, `calendar_events`,
`date_ideas`, `gift_ideas`, `tasks`, `shopping_items`, `notes`, `memories`,
`dashboard_widgets`.

Semuanya sudah ber-RLS household, sudah punya kolom `owner` (Eki/Dinda/Bersama), dan sudah
punya foreign key penghubung: `trips.savings_goal_id`, `wishlist_items.savings_goal_id`,
`places.trip_id`, `memories.trip_id`, `calendar_events.trip_id`. Jadi rantai
Trip → Target tabungan → Anggaran → Transaksi tinggal dirangkai di UI.

Catatan privasi yang sudah dipasang: `gift_ideas` hanya terbaca oleh pembuatnya (biar tetap
kejutan), dan `notes` bisa ditandai privat.

## Belum dikerjakan

1. Layar untuk 12 modul di atas.
2. Dashboard yang widgetnya bisa ditambah/dikurangi dan diatur ukurannya (tabel `dashboard_widgets` sudah siap).
3. KITA AI — panel asisten. Tempat pasang model menyusul.
4. Ekspor laporan ke Excel dan Google Sheets.
5. Merapikan halaman Keuangan, Anggaran, Laporan mengikuti tampilan dashboard yang baru.

## Urutan pasang migrasi

```
supabase/migrations/0001_init.sql      -- skema awal
supabase/migrations/0002_household.sql -- workspace bersama + modul baru
```

Jalankan `0002` di SQL Editor Supabase. Aman dijalankan berulang, dan otomatis membuatkan
household untuk akun yang sudah ada.
