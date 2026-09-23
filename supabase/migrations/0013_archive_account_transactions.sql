-- Transactions from inactive accounts remain in the ledger, but are archived
-- from normal reporting until every account they touch is active again.
alter table public.transactions
  add column if not exists archived_at timestamptz;

create index if not exists transactions_active_reporting_idx
  on public.transactions (household_id, occurred_on desc)
  where archived_at is null;

create or replace function public.archive_transactions_for_account_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active is distinct from old.is_active then
    update public.transactions transaction_row
    set archived_at = case
      when exists (
        select 1 from public.accounts source_account
        where source_account.id = transaction_row.account_id
          and source_account.is_active = false
      ) or exists (
        select 1 from public.accounts destination_account
        where destination_account.id = transaction_row.to_account_id
          and destination_account.is_active = false
      ) then coalesce(transaction_row.archived_at, now())
      else null
    end
    where transaction_row.account_id = new.id
       or transaction_row.to_account_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_archive_transactions_for_account_status on public.accounts;
create trigger trg_archive_transactions_for_account_status
after update of is_active on public.accounts
for each row execute function public.archive_transactions_for_account_status();

-- Archive-only updates must not replay financial effects or Pos spending.
drop trigger if exists trg_transactions_sync_balance on public.transactions;
create trigger trg_transactions_sync_balance
after insert or update of type, amount, account_id, to_account_id or delete
on public.transactions
for each row execute function public.transactions_sync_balance();

drop trigger if exists trg_transactions_sync_budget_post on public.transactions;
create trigger trg_transactions_sync_budget_post
after insert or update of type, amount, account_id, budget_post_id or delete
on public.transactions
for each row execute function public.apply_budget_post_spending();

update public.transactions transaction_row
set archived_at = now()
where transaction_row.archived_at is null
  and (
    exists (
      select 1 from public.accounts source_account
      where source_account.id = transaction_row.account_id
        and source_account.is_active = false
    ) or exists (
      select 1 from public.accounts destination_account
      where destination_account.id = transaction_row.to_account_id
        and destination_account.is_active = false
    )
  );

-- Hard deletion is an explicit user action: remove all related ledger/config
-- rows in one transaction, including transfers touching a second account.
create or replace function public.delete_account_with_history(p_account_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  active_household uuid;
begin
  if auth.uid() is null then
    raise exception 'Sesi kamu sudah habis. Masuk lagi untuk melanjutkan.';
  end if;

  active_household := public.current_household_id();
  if active_household is null then
    raise exception 'Workspace tidak ditemukan.';
  end if;

  if not exists (
    select 1 from public.accounts account_row
    where account_row.id = p_account_id
      and account_row.household_id = active_household
  ) then
    return false;
  end if;

  delete from public.transactions
  where household_id = active_household
    and (account_id = p_account_id or to_account_id = p_account_id);

  delete from public.recurring_transactions
  where household_id = active_household
    and (account_id = p_account_id or to_account_id = p_account_id);

  delete from public.budgets
  where household_id = active_household
    and account_id = p_account_id;

  delete from public.account_allocations
  where household_id = active_household
    and account_id = p_account_id;

  delete from public.accounts
  where id = p_account_id and household_id = active_household;

  return found;
end;
$$;

revoke all on function public.delete_account_with_history(uuid) from public;
grant execute on function public.delete_account_with_history(uuid) to authenticated;
