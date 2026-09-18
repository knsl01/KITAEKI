-- KITA — household (workspace bersama) + modul kehidupan bersama
-- Jalankan SETELAH 0001_init.sql. Aman dijalankan ulang.

-- ============================================================
-- ENUM TAMBAHAN
-- ============================================================
do $$ begin create type public.item_priority as enum ('low','medium','high'); exception when duplicate_object then null; end $$;
do $$ begin create type public.goal_kind as enum ('financial','personal'); exception when duplicate_object then null; end $$;
do $$ begin create type public.place_status as enum ('wishlist','planned','visited'); exception when duplicate_object then null; end $$;
do $$ begin create type public.trip_status as enum ('idea','planned','ongoing','done'); exception when duplicate_object then null; end $$;
do $$ begin create type public.note_visibility as enum ('shared','private'); exception when duplicate_object then null; end $$;

-- ============================================================
-- HOUSEHOLD
-- ============================================================
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'KITA',
  invite_code text not null unique default encode(gen_random_bytes(4), 'hex'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_key public.member_owner not null default 'eki',
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  constraint member_key_is_person check (member_key in ('eki','dinda'))
);
create index if not exists household_members_user_idx on public.household_members(user_id);

-- Household aktif milik user yang sedang login.
-- SECURITY DEFINER supaya policy tidak rekursif ke tabel yang sedang dievaluasi.
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid()
  order by joined_at
  limit 1;
$$;

create or replace function public.current_member_key()
returns public.member_owner
language sql
stable
security definer
set search_path = public
as $$
  select member_key
  from public.household_members
  where user_id = auth.uid()
  order by joined_at
  limit 1;
$$;

-- ============================================================
-- KOLOM household_id DI TABEL LAMA
-- ============================================================
alter table public.profiles              add column if not exists household_id uuid references public.households(id) on delete set null;
alter table public.accounts              add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.categories            add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.transactions          add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.budgets               add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.savings_goals         add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.recurring_transactions add column if not exists household_id uuid references public.households(id) on delete cascade;

alter table public.accounts              add column if not exists icon_key text;
alter table public.categories            add column if not exists icon_key text;

-- ============================================================
-- BACKFILL: setiap user lama dapat household sendiri
-- ============================================================
do $$
declare r record; hid uuid;
begin
  for r in select id from auth.users loop
    if not exists (select 1 from public.household_members where user_id = r.id) then
      insert into public.households (name, created_by) values ('KITA', r.id) returning id into hid;
      insert into public.household_members (household_id, user_id, member_key, role)
      values (hid, r.id, 'eki', 'owner');

      update public.profiles               set household_id = hid where id = r.id and household_id is null;
      update public.accounts               set household_id = hid where user_id = r.id and household_id is null;
      update public.categories             set household_id = hid where user_id = r.id and household_id is null;
      update public.transactions           set household_id = hid where user_id = r.id and household_id is null;
      update public.budgets                set household_id = hid where user_id = r.id and household_id is null;
      update public.savings_goals          set household_id = hid where user_id = r.id and household_id is null;
      update public.recurring_transactions set household_id = hid where user_id = r.id and household_id is null;
    end if;
  end loop;
end $$;

create index if not exists accounts_household_idx              on public.accounts(household_id);
create index if not exists categories_household_idx            on public.categories(household_id);
create index if not exists transactions_household_date_idx     on public.transactions(household_id, occurred_on desc);
create index if not exists budgets_household_idx               on public.budgets(household_id, period_month);
create index if not exists savings_goals_household_idx         on public.savings_goals(household_id);
create index if not exists recurring_household_idx             on public.recurring_transactions(household_id);

-- budget unik per household, bukan per user
alter table public.budgets drop constraint if exists budgets_user_id_category_id_period_month_key;
create unique index if not exists budgets_household_unique
  on public.budgets(household_id, category_id, period_month);

-- kategori unik per household
alter table public.categories drop constraint if exists categories_user_id_name_kind_key;
create unique index if not exists categories_household_unique
  on public.categories(household_id, name, kind);

-- ============================================================
-- PENGATURAN WORKSPACE (banner dashboard)
-- ============================================================
create table if not exists public.workspace_settings (
  household_id uuid primary key references public.households(id) on delete cascade,
  banner_image_url text,
  banner_title text not null default 'Selamat datang',
  banner_subtitle text not null default 'Keuangan yang terencana, hidup yang lebih tenang.',
  banner_quote text not null default 'Sedikit demi sedikit, jadi besar.',
  updated_at timestamptz not null default now()
);

-- Susunan widget dashboard, per user (Eki dan Dinda boleh beda)
create table if not exists public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  widget_key text not null,
  position int not null default 0,
  span text not null default 'md',
  is_visible boolean not null default true,
  unique (user_id, widget_key)
);
create index if not exists dashboard_widgets_user_idx on public.dashboard_widgets(user_id, position);

-- ============================================================
-- MODUL KEHIDUPAN BERSAMA
-- ============================================================
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  owner public.member_owner not null default 'shared',
  name text not null,
  price numeric(16,2),
  url text,
  image_url text,
  priority public.item_priority not null default 'medium',
  is_purchased boolean not null default false,
  purchased_on date,
  savings_goal_id uuid references public.savings_goals(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.life_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  owner public.member_owner not null default 'shared',
  kind public.goal_kind not null default 'personal',
  name text not null,
  target_value numeric(16,2),
  current_value numeric(16,2) not null default 0,
  unit text,
  deadline date,
  notes text,
  savings_goal_id uuid references public.savings_goals(id) on delete set null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  destination text not null,
  cover_image_url text,
  start_date date,
  end_date date,
  status public.trip_status not null default 'idea',
  budget numeric(16,2),
  savings_goal_id uuid references public.savings_goals(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- satu tabel untuk itinerary dan checklist trip
create table if not exists public.trip_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  kind text not null default 'itinerary',
  title text not null,
  detail text,
  scheduled_on date,
  scheduled_time time,
  is_done boolean not null default false,
  position int not null default 0,
  constraint trip_item_kind check (kind in ('itinerary','checklist'))
);
create index if not exists trip_items_trip_idx on public.trip_items(trip_id, position);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  area text,
  status public.place_status not null default 'wishlist',
  image_url text,
  visited_on date,
  rating int check (rating between 1 and 5),
  notes text,
  trip_id uuid references public.trips(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  owner public.member_owner not null default 'shared',
  title text not null,
  detail text,
  starts_on date not null,
  starts_at time,
  ends_on date,
  is_all_day boolean not null default true,
  trip_id uuid references public.trips(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists calendar_events_household_date_idx on public.calendar_events(household_id, starts_on);

create table if not exists public.date_ideas (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  category text not null default 'lainnya',
  estimated_cost numeric(16,2),
  notes text,
  last_done_on date,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

-- Ide hadiah: hanya pembuatnya yang boleh melihat (biar tetap kejutan)
create table if not exists public.gift_ideas (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  recipient public.member_owner not null default 'dinda',
  name text not null,
  price numeric(16,2),
  url text,
  occasion text,
  notes text,
  is_bought boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  assigned_to public.member_owner not null default 'shared',
  title text not null,
  detail text,
  due_on date,
  is_done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tasks_household_due_idx on public.tasks(household_id, due_on);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  assigned_to public.member_owner not null default 'shared',
  name text not null,
  quantity text,
  estimated_price numeric(16,2),
  is_bought boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  visibility public.note_visibility not null default 'shared',
  title text not null,
  body text,
  pinned boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  caption text,
  image_url text,
  happened_on date not null default current_date,
  trip_id uuid references public.trips(id) on delete set null,
  place_id uuid references public.places(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists memories_household_date_idx on public.memories(household_id, happened_on desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.households        enable row level security;
alter table public.household_members enable row level security;

drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select using (id = public.current_household_id());
drop policy if exists households_insert on public.households;
create policy households_insert on public.households
  for insert with check (created_by = auth.uid());
drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update using (id = public.current_household_id()) with check (id = public.current_household_id());

drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members
  for select using (household_id = public.current_household_id() or user_id = auth.uid());
drop policy if exists household_members_insert on public.household_members;
create policy household_members_insert on public.household_members
  for insert with check (user_id = auth.uid());
drop policy if exists household_members_delete on public.household_members;
create policy household_members_delete on public.household_members
  for delete using (user_id = auth.uid());

-- Tabel yang dipagari penuh oleh household
do $$
declare t text;
begin
  foreach t in array array[
    'accounts','categories','transactions','budgets','savings_goals','recurring_transactions',
    'workspace_settings','wishlist_items','life_goals','trips','trip_items','places',
    'calendar_events','date_ideas','tasks','shopping_items','memories'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s_select_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$I', t);

    execute format('drop policy if exists "%1$s_hh_select" on public.%1$I', t);
    execute format('create policy "%1$s_hh_select" on public.%1$I for select using (household_id = public.current_household_id())', t);
    execute format('drop policy if exists "%1$s_hh_insert" on public.%1$I', t);
    execute format('create policy "%1$s_hh_insert" on public.%1$I for insert with check (household_id = public.current_household_id())', t);
    execute format('drop policy if exists "%1$s_hh_update" on public.%1$I', t);
    execute format('create policy "%1$s_hh_update" on public.%1$I for update using (household_id = public.current_household_id()) with check (household_id = public.current_household_id())', t);
    execute format('drop policy if exists "%1$s_hh_delete" on public.%1$I', t);
    execute format('create policy "%1$s_hh_delete" on public.%1$I for delete using (household_id = public.current_household_id())', t);
  end loop;
end $$;

-- Ide hadiah dan catatan privat: satu household, tapi tetap privat per pembuat
alter table public.gift_ideas enable row level security;
drop policy if exists gift_ideas_own on public.gift_ideas;
create policy gift_ideas_own on public.gift_ideas
  for all using (created_by = auth.uid() and household_id = public.current_household_id())
  with check (created_by = auth.uid() and household_id = public.current_household_id());

alter table public.notes enable row level security;
drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
  for select using (
    household_id = public.current_household_id()
    and (visibility = 'shared' or created_by = auth.uid())
  );
drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes
  for insert with check (household_id = public.current_household_id() and created_by = auth.uid());
drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes
  for update using (household_id = public.current_household_id() and created_by = auth.uid())
  with check (household_id = public.current_household_id() and created_by = auth.uid());
drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes
  for delete using (household_id = public.current_household_id() and created_by = auth.uid());

alter table public.dashboard_widgets enable row level security;
drop policy if exists dashboard_widgets_own on public.dashboard_widgets;
create policy dashboard_widgets_own on public.dashboard_widgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- profiles: anggota household boleh melihat nama pasangannya
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or household_id = public.current_household_id());

-- ============================================================
-- BOOTSTRAP USER BARU: household otomatis + kategori awal
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare hid uuid;
begin
  insert into public.households (name, created_by) values ('KITA', new.id) returning id into hid;
  insert into public.household_members (household_id, user_id, member_key, role)
  values (hid, new.id, 'eki', 'owner');

  insert into public.profiles (id, email, full_name, household_id)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), hid)
  on conflict (id) do update set household_id = excluded.household_id;

  insert into public.workspace_settings (household_id) values (hid) on conflict do nothing;

  insert into public.categories (user_id, household_id, name, kind, color, icon_key) values
    (new.id, hid, 'Makanan',      'expense', '#3F5540', 'utensils'),
    (new.id, hid, 'Transportasi', 'expense', '#8A9A5B', 'car'),
    (new.id, hid, 'Tagihan',      'expense', '#C7A17A', 'receipt'),
    (new.id, hid, 'Belanja',      'expense', '#D9C3A5', 'shopping-bag'),
    (new.id, hid, 'Hiburan',      'expense', '#A3B18A', 'clapperboard'),
    (new.id, hid, 'Kesehatan',    'expense', '#9B8281', 'heart-pulse'),
    (new.id, hid, 'Rumah',        'expense', '#7E8E7A', 'house'),
    (new.id, hid, 'Lainnya',      'expense', '#B0B0B0', 'circle-dashed'),
    (new.id, hid, 'Gaji',         'income',  '#3F5540', 'wallet'),
    (new.id, hid, 'Bonus',        'income',  '#8A9A5B', 'gift'),
    (new.id, hid, 'Lainnya',      'income',  '#B0B0B0', 'circle-dashed')
  on conflict do nothing;

  return new;
end;
$$;

-- ============================================================
-- GABUNG HOUSEHOLD PASANGAN LEWAT KODE UNDANGAN
-- ============================================================
create or replace function public.join_household(p_code text, p_member_key public.member_owner default 'dinda')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare hid uuid; old_hid uuid;
begin
  if auth.uid() is null then raise exception 'Belum masuk'; end if;
  if p_member_key not in ('eki','dinda') then raise exception 'Peran harus Eki atau Dinda'; end if;

  select id into hid from public.households where invite_code = lower(trim(p_code));
  if hid is null then raise exception 'Kode undangan tidak ditemukan'; end if;

  select household_id into old_hid from public.household_members where user_id = auth.uid();

  -- pindahkan data yang sudah dibuat user ini ke household tujuan
  if old_hid is not null and old_hid <> hid then
    update public.accounts               set household_id = hid where household_id = old_hid;
    update public.categories             set household_id = hid where household_id = old_hid;
    update public.transactions           set household_id = hid where household_id = old_hid;
    update public.budgets                set household_id = hid where household_id = old_hid;
    update public.savings_goals          set household_id = hid where household_id = old_hid;
    update public.recurring_transactions set household_id = hid where household_id = old_hid;
    delete from public.household_members where user_id = auth.uid();
  end if;

  insert into public.household_members (household_id, user_id, member_key)
  values (hid, auth.uid(), p_member_key)
  on conflict (household_id, user_id) do update set member_key = excluded.member_key;

  update public.profiles set household_id = hid, default_owner = p_member_key where id = auth.uid();

  return hid;
end;
$$;

revoke all on function public.join_household(text, public.member_owner) from public;
grant execute on function public.join_household(text, public.member_owner) to authenticated;

-- ============================================================
-- STORAGE: satu bucket, dipisah per folder household
-- ============================================================
insert into storage.buckets (id, name, public)
values ('kita-media', 'kita-media', true)
on conflict (id) do nothing;

drop policy if exists "kita_media_read" on storage.objects;
create policy "kita_media_read" on storage.objects
  for select using (bucket_id = 'kita-media');

drop policy if exists "kita_media_write" on storage.objects;
create policy "kita_media_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'kita-media'
    and (storage.foldername(name))[1] = public.current_household_id()::text
  );

drop policy if exists "kita_media_update" on storage.objects;
create policy "kita_media_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'kita-media' and (storage.foldername(name))[1] = public.current_household_id()::text);

drop policy if exists "kita_media_delete" on storage.objects;
create policy "kita_media_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'kita-media' and (storage.foldername(name))[1] = public.current_household_id()::text);
