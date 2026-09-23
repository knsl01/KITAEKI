-- Pos menyimpan target kebutuhan, dana yang masih dicadangkan, dan total yang
-- benar-benar sudah dibelanjakan. Saldo akun hanya berubah oleh transaksi nyata.

drop trigger if exists trg_validate_budget_post_allocation on public.transactions;
drop trigger if exists trg_validate_account_allocation on public.account_allocations;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'account_allocations' and column_name = 'amount'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'account_allocations' and column_name = 'target_amount'
  ) then
    alter table public.account_allocations rename column amount to target_amount;
  end if;
end;
$$;

alter table public.account_allocations
  add column if not exists allocated_amount numeric(16,2) not null default 0,
  add column if not exists spent_amount numeric(16,2) not null default 0;

with spent as (
  select allocation.id, coalesce(sum(transaction_row.amount), 0)::numeric(16,2) as spent_amount
  from public.account_allocations allocation
  left join public.transactions transaction_row on transaction_row.budget_post_id = allocation.id
  group by allocation.id
)
update public.account_allocations allocation
set spent_amount = spent.spent_amount,
    allocated_amount = greatest(allocation.target_amount - spent.spent_amount, 0),
    updated_at = now()
from spent
where spent.id = allocation.id;

alter table public.account_allocations
  alter column target_amount set not null,
  alter column allocated_amount set not null,
  alter column spent_amount set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'account_allocations_allocated_nonnegative_check' and conrelid = 'public.account_allocations'::regclass) then
    alter table public.account_allocations add constraint account_allocations_allocated_nonnegative_check check (allocated_amount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'account_allocations_spent_nonnegative_check' and conrelid = 'public.account_allocations'::regclass) then
    alter table public.account_allocations add constraint account_allocations_spent_nonnegative_check check (spent_amount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'account_allocations_allocated_within_target_check' and conrelid = 'public.account_allocations'::regclass) then
    alter table public.account_allocations add constraint account_allocations_allocated_within_target_check check (allocated_amount <= target_amount);
  end if;
end;
$$;

create or replace function public.validate_budget_post_allocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allocation public.account_allocations%rowtype;
  available_amount numeric(16,2);
begin
  if new.budget_post_id is null then
    return new;
  end if;

  if new.type <> 'expense' then
    raise exception 'Pos anggaran hanya dapat dipakai pada transaksi pengeluaran.';
  end if;

  select * into allocation
  from public.account_allocations
  where id = new.budget_post_id
  for update;

  if not found then
    raise exception 'Pos anggaran tidak ditemukan.';
  end if;
  if allocation.account_id is null
    or allocation.account_id <> new.account_id
    or allocation.category_id <> new.category_id
    or allocation.household_id <> new.household_id then
    raise exception 'Akun dan kategori transaksi harus sesuai dengan pos anggaran.';
  end if;

  available_amount := allocation.allocated_amount;
  if tg_op = 'UPDATE' and old.budget_post_id = new.budget_post_id then
    available_amount := available_amount + old.amount;
  end if;
  if new.amount > available_amount then
    raise exception 'Nominal melebihi dana yang tersedia di pos (%).', greatest(available_amount, 0);
  end if;
  return new;
end;
$$;

create trigger trg_validate_budget_post_allocation
before insert or update on public.transactions
for each row execute function public.validate_budget_post_allocation();

create or replace function public.validate_account_allocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance numeric(16,2);
  account_name text;
  other_allocated numeric(16,2);
  internal_change text;
begin
  if new.account_id is null then
    raise exception 'Setiap pos harus terhubung ke akun sumber.';
  end if;
  if new.target_amount <= 0 or new.allocated_amount < 0 or new.allocated_amount > new.target_amount then
    raise exception 'Nominal target atau alokasi pos tidak valid.';
  end if;

  if tg_op = 'UPDATE' and (new.account_id is distinct from old.account_id or new.category_id is distinct from old.category_id) then
    if exists (select 1 from public.transactions where budget_post_id = old.id) then
      raise exception 'Akun atau kategori pos tidak bisa diganti karena pos sudah dipakai transaksi.';
    end if;
  end if;

  select balance, name into current_balance, account_name
  from public.accounts
  where id = new.account_id and household_id = new.household_id and is_active = true
  for update;
  if not found then
    raise exception 'Pilih akun aktif yang terhubung ke rumah tangga ini.';
  end if;

  internal_change := current_setting('kita.internal_pos_funding_change', true);
  if internal_change = 'on' then
    return new;
  end if;

  select coalesce(sum(other.allocated_amount), 0)
  into other_allocated
  from public.account_allocations other
  where other.account_id = new.account_id
    and other.household_id = new.household_id
    and (tg_op <> 'UPDATE' or other.id <> new.id);

  if new.allocated_amount + other_allocated > current_balance then
    raise exception 'Saldo tersedia di % tidak mencukupi.', account_name;
  end if;
  return new;
end;
$$;

create trigger trg_validate_account_allocation
before insert or update on public.account_allocations
for each row execute function public.validate_account_allocation();

create or replace function public.apply_budget_post_spending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_setting text;
begin
  previous_setting := coalesce(current_setting('kita.internal_pos_funding_change', true), '');
  perform set_config('kita.internal_pos_funding_change', 'on', true);

  if tg_op = 'INSERT' then
    if new.budget_post_id is not null then
      update public.account_allocations
      set allocated_amount = allocated_amount - new.amount,
          spent_amount = spent_amount + new.amount,
          updated_at = now()
      where id = new.budget_post_id;
    end if;
    perform set_config('kita.internal_pos_funding_change', previous_setting, true);
    return new;
  elsif tg_op = 'DELETE' then
    if old.budget_post_id is not null then
      update public.account_allocations
      set allocated_amount = least(greatest(target_amount - (spent_amount - old.amount), 0), allocated_amount + old.amount),
          spent_amount = greatest(spent_amount - old.amount, 0),
          updated_at = now()
      where id = old.budget_post_id;
    end if;
    perform set_config('kita.internal_pos_funding_change', previous_setting, true);
    return old;
  else
    if old.budget_post_id is not null and old.budget_post_id = new.budget_post_id then
      update public.account_allocations
      set allocated_amount = least(greatest(target_amount - (spent_amount - old.amount + new.amount), 0), allocated_amount + old.amount - new.amount),
          spent_amount = greatest(spent_amount - old.amount + new.amount, 0),
          updated_at = now()
      where id = old.budget_post_id;
    else
      if old.budget_post_id is not null then
        update public.account_allocations
        set allocated_amount = least(greatest(target_amount - (spent_amount - old.amount), 0), allocated_amount + old.amount),
            spent_amount = greatest(spent_amount - old.amount, 0),
            updated_at = now()
        where id = old.budget_post_id;
      end if;
      if new.budget_post_id is not null then
        update public.account_allocations
        set allocated_amount = allocated_amount - new.amount,
            spent_amount = spent_amount + new.amount,
            updated_at = now()
        where id = new.budget_post_id;
      end if;
    end if;
    perform set_config('kita.internal_pos_funding_change', previous_setting, true);
    return new;
  end if;
end;
$$;

drop trigger if exists trg_transactions_sync_budget_post on public.transactions;
create trigger trg_transactions_sync_budget_post
after insert or update or delete on public.transactions
for each row execute function public.apply_budget_post_spending();

-- Pengisian pos tetap merupakan alokasi, bukan transaksi dan bukan pengurangan saldo.
create or replace function public.fill_account_allocation(p_allocation_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  allocation public.account_allocations%rowtype;
  account_balance numeric(16,2);
  account_name text;
  already_reserved numeric(16,2);
  additional_amount numeric(16,2);
  previous_setting text;
begin
  if auth.uid() is null then
    raise exception 'Sesi kamu sudah habis. Masuk lagi untuk melanjutkan.';
  end if;

  select * into allocation
  from public.account_allocations
  where id = p_allocation_id and household_id = public.current_household_id()
  for update;
  if not found or allocation.account_id is null then
    raise exception 'Pos belum terhubung ke akun sumber.';
  end if;

  select balance, name into account_balance, account_name
  from public.accounts
  where id = allocation.account_id
    and household_id = allocation.household_id
    and is_active = true
  for update;
  if not found then
    raise exception 'Akun sumber tidak ditemukan atau sudah dinonaktifkan.';
  end if;

  select coalesce(sum(allocated_amount), 0)
  into already_reserved
  from public.account_allocations
  where account_id = allocation.account_id
    and household_id = allocation.household_id
    and id <> allocation.id;

  additional_amount := least(
    greatest(allocation.target_amount - allocation.allocated_amount, 0),
    greatest(account_balance - already_reserved - allocation.allocated_amount, 0)
  );

  if additional_amount <= 0 then
    return 0;
  end if;

  previous_setting := coalesce(current_setting('kita.internal_pos_funding_change', true), '');
  perform set_config('kita.internal_pos_funding_change', 'on', true);
  update public.account_allocations
  set allocated_amount = allocated_amount + additional_amount,
      updated_at = now()
  where id = allocation.id;
  perform set_config('kita.internal_pos_funding_change', previous_setting, true);

  return additional_amount;
end;
$$;

revoke all on function public.fill_account_allocation(uuid) from public;
grant execute on function public.fill_account_allocation(uuid) to authenticated;
