-- ============================================================
-- WEB PUSH (notifikasi) — jalankan sekali di Supabase → SQL Editor.
-- Aman dijalankan ulang (idempotent). Menggantikan push_notification_schema.sql lama.
--
-- Akar masalah versi lama: policy RLS hanya mengizinkan user membaca langganan MILIKNYA sendiri,
-- padahal server perlu langganan pasangan (satu household) untuk mengirim notifikasi. Hasilnya
-- query selalu kosong dan tidak ada notifikasi yang pernah terkirim. Di sini dibuat fungsi
-- SECURITY DEFINER yang hanya membuka langganan household milik si pemanggil — tanpa perlu
-- service-role key di server.
-- ============================================================

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.push_subscriptions add column if not exists user_agent text;
alter table public.push_subscriptions add column if not exists updated_at timestamptz not null default now();

create index if not exists push_subscriptions_household_idx on public.push_subscriptions(household_id);
create index if not exists push_subscriptions_user_idx      on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can manage their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Service role has full access to push subscriptions" on public.push_subscriptions;
drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Simpan / pindahkan langganan perangkat ke user yang sedang login.
-- (Kalau satu HP dipakai gantian Eki & Dinda, endpoint yang sama otomatis pindah pemilik.)
create or replace function public.save_push_subscription(
  p_endpoint   text,
  p_p256dh     text,
  p_auth       text,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hid uuid := public.current_household_id();
begin
  if v_uid is null or v_hid is null then
    raise exception 'Tidak diizinkan: belum login atau belum punya workspace';
  end if;

  insert into public.push_subscriptions (user_id, household_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, v_hid, p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id      = excluded.user_id,
        household_id = excluded.household_id,
        p256dh       = excluded.p256dh,
        auth         = excluded.auth,
        user_agent   = excluded.user_agent,
        updated_at   = now();
end $$;

-- Semua langganan dalam household si pemanggil (termasuk milik pasangan).
create or replace function public.household_push_subscriptions()
returns table (id uuid, user_id uuid, endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.user_id, s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  where s.household_id = public.current_household_id();
$$;

-- Hapus langganan yang sudah mati (dipanggil server saat push service membalas 404/410).
create or replace function public.delete_push_subscriptions(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions
  where id = any(p_ids)
    and household_id = public.current_household_id();
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public;
revoke all on function public.household_push_subscriptions()                 from public;
revoke all on function public.delete_push_subscriptions(uuid[])              from public;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.household_push_subscriptions()                 to authenticated;
grant execute on function public.delete_push_subscriptions(uuid[])              to authenticated;
