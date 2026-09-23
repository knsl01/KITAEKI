-- Pos adalah alokasi saldo akun. Transaksi nyata (bukan pos) mengurangi saldo.
-- Relasi eksplisit membuat pemakaian satu pos dapat dihitung tepat, termasuk
-- saat transaksi diedit/dihapus atau pos dihapus.

-- Untuk rumah tangga dengan tepat satu akun aktif, migrasikan pos lama "semua akun"
-- secara aman. Jika ada beberapa akun, biarkan belum terhubung agar pengguna memilih.
with only_account as (
  select household_id, min(id::text)::uuid as account_id
  from public.accounts
  where is_active = true and household_id is not null
  group by household_id
  having count(*) = 1
)
update public.account_allocations allocation
set account_id = only_account.account_id, updated_at = now()
from only_account
where allocation.household_id = only_account.household_id
  and allocation.account_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'account_allocations_requires_account_check'
      and conrelid = 'public.account_allocations'::regclass
  ) then
    alter table public.account_allocations
      add constraint account_allocations_requires_account_check
      check (account_id is not null) not valid;
  end if;
end;
$$;

alter table public.transactions
  add column if not exists budget_post_id uuid
  references public.account_allocations(id) on delete set null;

create index if not exists transactions_budget_post_idx
  on public.transactions(budget_post_id)
  where budget_post_id is not null;

-- Hubungkan transaksi lama ke pos yang cocok persis (akun + kategori).
-- Pos global yang belum memiliki akun tidak dipakai untuk backfill.
update public.transactions transaction_row
set budget_post_id = allocation.id
from public.account_allocations allocation
where transaction_row.type = 'expense'
  and transaction_row.budget_post_id is null
  and transaction_row.account_id = allocation.account_id
  and transaction_row.category_id = allocation.category_id;

create or replace function public.validate_budget_post_allocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allocation public.account_allocations%rowtype;
  already_spent numeric(16,2);
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

  select coalesce(sum(amount), 0) into already_spent
  from public.transactions
  where budget_post_id = allocation.id
    and (tg_op <> 'UPDATE' or id <> new.id);

  if new.amount > allocation.amount - already_spent then
    raise exception 'Nominal melebihi sisa pos anggaran (%).', greatest(allocation.amount - already_spent, 0);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_budget_post_allocation on public.transactions;
create trigger trg_validate_budget_post_allocation
before insert or update on public.transactions
for each row execute function public.validate_budget_post_allocation();

-- Pos yang sudah dipakai tidak boleh dipindah ke akun/kategori lain,
-- atau nominalnya diturunkan di bawah pengeluaran yang sudah tercatat.
create or replace function public.validate_account_allocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance numeric(16,2);
  account_name text;
  already_spent numeric(16,2);
  other_remaining numeric(16,2);
begin
  if new.account_id is null then
    raise exception 'Setiap pos harus terhubung ke akun sumber.';
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

  select coalesce(sum(amount), 0) into already_spent
  from public.transactions
  where budget_post_id = new.id;
  if new.amount < already_spent then
    raise exception 'Nominal pos tidak boleh lebih kecil dari transaksi yang sudah memakai pos ini.';
  end if;

  select coalesce(sum(greatest(other.amount - coalesce(spent.amount, 0), 0)), 0)
  into other_remaining
  from public.account_allocations other
  left join lateral (
    select sum(transaction_row.amount) as amount
    from public.transactions transaction_row
    where transaction_row.budget_post_id = other.id
  ) spent on true
  where other.account_id = new.account_id
    and other.household_id = new.household_id
    and (tg_op <> 'UPDATE' or other.id <> new.id);

  if (new.amount - already_spent) + other_remaining > current_balance then
    raise exception 'Saldo tersedia di % tidak mencukupi.', account_name;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_account_allocation on public.account_allocations;
create trigger trg_validate_account_allocation
before insert or update on public.account_allocations
for each row execute function public.validate_account_allocation();
