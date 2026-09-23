-- Pos baru hanya mencatat target; dana baru dicadangkan saat pengguna memilih nominal Isi Pos.
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
  if tg_op = 'INSERT' and new.allocated_amount <> 0 then
    raise exception 'Pos baru dimulai tanpa alokasi. Gunakan Isi Pos untuk memasukkan nominal secara manual.';
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

-- Hilangkan endpoint lama yang otomatis mengisi sampai batas maksimum.
drop function if exists public.fill_account_allocation(uuid);

create or replace function public.fill_account_allocation(p_allocation_id uuid, p_amount numeric)
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
  available_amount numeric(16,2);
  previous_setting text;
begin
  if auth.uid() is null then
    raise exception 'Sesi kamu sudah habis. Masuk lagi untuk melanjutkan.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Masukkan nominal yang ingin diisi ke pos.';
  end if;

  select * into allocation
  from public.account_allocations
  where id = p_allocation_id and household_id = public.current_household_id()
  for update;
  if not found or allocation.account_id is null then
    raise exception 'Pos belum terhubung ke akun sumber.';
  end if;
  if p_amount > greatest(allocation.target_amount - allocation.allocated_amount, 0) then
    raise exception 'Nominal melebihi sisa kebutuhan pos.';
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
  available_amount := greatest(account_balance - already_reserved - allocation.allocated_amount, 0);
  if p_amount > available_amount then
    raise exception 'Saldo tersedia di % tidak mencukupi.', account_name;
  end if;

  previous_setting := coalesce(current_setting('kita.internal_pos_funding_change', true), '');
  perform set_config('kita.internal_pos_funding_change', 'on', true);
  update public.account_allocations
  set allocated_amount = allocated_amount + p_amount,
      updated_at = now()
  where id = allocation.id;
  perform set_config('kita.internal_pos_funding_change', previous_setting, true);
  return p_amount;
end;
$$;

revoke all on function public.fill_account_allocation(uuid, numeric) from public;
grant execute on function public.fill_account_allocation(uuid, numeric) to authenticated;
