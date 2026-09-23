-- Pos/alokasi saldo adalah konfigurasi tetap, bukan record anggaran bulanan.
-- Data paling baru per akun/kategori disalin tanpa menghapus riwayat budgets lama.
create table if not exists public.account_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(16,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists account_allocations_household_account_category_uidx
  on public.account_allocations (
    household_id,
    (coalesce(account_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    category_id
  );
create index if not exists account_allocations_household_idx
  on public.account_allocations(household_id, account_id);

alter table public.account_allocations enable row level security;
drop policy if exists account_allocations_household_access on public.account_allocations;
create policy account_allocations_household_access on public.account_allocations
  for all
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- Ambil nominal terakhir untuk tiap pos lama. Record bulanan lama tetap ada sebagai arsip.
insert into public.account_allocations (user_id, household_id, account_id, category_id, amount, created_at, updated_at)
select distinct on (household_id, account_id, category_id)
  user_id, household_id, account_id, category_id, amount, created_at, now()
from public.budgets
where household_id is not null and category_id is not null
order by household_id, account_id, category_id, period_month desc, created_at desc
on conflict do nothing;
