-- Pos anggaran dimiliki oleh satu akun agar saldo BCA, e-wallet, dan tunai
-- dapat dibagi ke kebutuhan yang berbeda secara mandiri.
alter table public.budgets
  add column if not exists account_id uuid references public.accounts(id) on delete cascade;

drop index if exists public.budgets_household_unique;
create unique index if not exists budgets_account_allocation_unique
  on public.budgets(household_id, account_id, category_id, period_month);

create index if not exists budgets_account_period_idx
  on public.budgets(account_id, period_month);
