-- KITA - Eki & Dinda : initial schema
-- Run in Supabase SQL Editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type public.member_owner as enum ('eki', 'dinda', 'shared');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('income', 'expense', 'transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.category_kind as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_type as enum ('bank', 'ewallet', 'cash', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.recurring_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');
exception when duplicate_object then null; end $$;

-- ============================================================
-- TABLES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  default_owner public.member_owner not null default 'shared',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.account_type not null default 'bank',
  owner public.member_owner not null default 'shared',
  initial_balance numeric(16,2) not null default 0,
  balance numeric(16,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accounts_user_id_idx on public.accounts(user_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind public.category_kind not null default 'expense',
  color text not null default '#3F5540',
  created_at timestamptz not null default now(),
  unique (user_id, name, kind)
);
create index if not exists categories_user_id_idx on public.categories(user_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(16,2) not null check (amount > 0),
  occurred_on date not null default current_date,
  description text,
  owner public.member_owner not null default 'shared',
  account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transfer_needs_two_accounts check (
    (type <> 'transfer') or (account_id is not null and to_account_id is not null and account_id <> to_account_id)
  )
);
create index if not exists transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
create index if not exists transactions_account_idx on public.transactions(account_id);
create index if not exists transactions_category_idx on public.transactions(category_id);
create index if not exists transactions_type_idx on public.transactions(user_id, type);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(16,2) not null check (amount > 0),
  period_month date not null, -- always the 1st day of the month
  created_at timestamptz not null default now(),
  unique (user_id, category_id, period_month)
);
create index if not exists budgets_user_period_idx on public.budgets(user_id, period_month);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(16,2) not null check (target_amount > 0),
  current_amount numeric(16,2) not null default 0,
  target_date date,
  owner public.member_owner not null default 'shared',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists savings_goals_user_idx on public.savings_goals(user_id);

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(16,2) not null check (amount > 0),
  description text,
  owner public.member_owner not null default 'shared',
  account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  frequency public.recurring_frequency not null default 'monthly',
  next_run_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recurring_user_next_idx on public.recurring_transactions(user_id, next_run_on);

-- ============================================================
-- BALANCE SYNC
-- ============================================================
create or replace function public.apply_transaction_effect(
  p_type public.transaction_type,
  p_amount numeric,
  p_account uuid,
  p_to_account uuid,
  p_sign int
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_type = 'income' then
    if p_account is not null then
      update public.accounts set balance = balance + (p_amount * p_sign), updated_at = now() where id = p_account;
    end if;
  elsif p_type = 'expense' then
    if p_account is not null then
      update public.accounts set balance = balance - (p_amount * p_sign), updated_at = now() where id = p_account;
    end if;
  elsif p_type = 'transfer' then
    if p_account is not null then
      update public.accounts set balance = balance - (p_amount * p_sign), updated_at = now() where id = p_account;
    end if;
    if p_to_account is not null then
      update public.accounts set balance = balance + (p_amount * p_sign), updated_at = now() where id = p_to_account;
    end if;
  end if;
end;
$$;

create or replace function public.transactions_sync_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    perform public.apply_transaction_effect(new.type, new.amount, new.account_id, new.to_account_id, 1);
    return new;
  elsif (tg_op = 'UPDATE') then
    perform public.apply_transaction_effect(old.type, old.amount, old.account_id, old.to_account_id, -1);
    perform public.apply_transaction_effect(new.type, new.amount, new.account_id, new.to_account_id, 1);
    return new;
  elsif (tg_op = 'DELETE') then
    perform public.apply_transaction_effect(old.type, old.amount, old.account_id, old.to_account_id, -1);
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_transactions_sync_balance on public.transactions;
create trigger trg_transactions_sync_balance
after insert or update or delete on public.transactions
for each row execute function public.transactions_sync_balance();

-- keep balance anchored to initial_balance when it is edited
create or replace function public.accounts_apply_initial_balance()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.balance := coalesce(new.initial_balance, 0);
  elsif tg_op = 'UPDATE' and new.initial_balance is distinct from old.initial_balance then
    new.balance := new.balance + (new.initial_balance - old.initial_balance);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_accounts_initial_balance on public.accounts;
create trigger trg_accounts_initial_balance
before insert or update on public.accounts
for each row execute function public.accounts_apply_initial_balance();

-- ============================================================
-- NEW USER BOOTSTRAP (profile + starter categories)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, kind, color) values
    (new.id, 'Makanan', 'expense', '#3F5540'),
    (new.id, 'Transportasi', 'expense', '#8A9A5B'),
    (new.id, 'Tagihan', 'expense', '#C7A17A'),
    (new.id, 'Belanja', 'expense', '#D9C3A5'),
    (new.id, 'Hiburan', 'expense', '#A3B18A'),
    (new.id, 'Kesehatan', 'expense', '#9B8281'),
    (new.id, 'Lainnya', 'expense', '#B0B0B0'),
    (new.id, 'Gaji', 'income', '#3F5540'),
    (new.id, 'Bonus', 'income', '#8A9A5B'),
    (new.id, 'Lainnya', 'income', '#B0B0B0')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.recurring_transactions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['accounts','categories','transactions','budgets','savings_goals','recurring_transactions']
  loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$I', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select using (auth.uid() = user_id)', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$I', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert with check (auth.uid() = user_id)', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$I', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$I', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
