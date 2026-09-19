-- ============================================================
-- 0003 — Dashboard widget yang bisa diatur
--
-- Tabel dashboard_widgets sudah dibuat di 0002 (per user, RLS user_id = auth.uid()).
-- Migrasi ini hanya menambah dua kolom dan pembatas nilai:
--
--   span     : lebar widget. xs = ¼, sm = ⅓, md = ½, lg = ⅔, xl = penuh.
--   row_span : tinggi widget dalam satuan baris (1–3).
--   config   : pengaturan khusus widget, mis. foto latar kartu Total saldo.
--
-- Aman dijalankan berulang.
-- ============================================================

alter table public.dashboard_widgets
  add column if not exists row_span smallint not null default 1;

alter table public.dashboard_widgets
  add column if not exists config jsonb not null default '{}'::jsonb;

-- Nilai lama di kolom span (kalau ada) yang bukan token baru dijadikan 'md'
update public.dashboard_widgets
   set span = 'md'
 where span not in ('xs', 'sm', 'md', 'lg', 'xl');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dashboard_widgets_span_check'
  ) then
    alter table public.dashboard_widgets
      add constraint dashboard_widgets_span_check
      check (span in ('xs', 'sm', 'md', 'lg', 'xl'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'dashboard_widgets_row_span_check'
  ) then
    alter table public.dashboard_widgets
      add constraint dashboard_widgets_row_span_check
      check (row_span between 1 and 3);
  end if;
end $$;
