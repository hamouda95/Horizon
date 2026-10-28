alter table public.bank_accounts
  add column if not exists source_name text;

alter table public.bank_accounts
  drop constraint if exists bank_accounts_account_type_check;
alter table public.bank_accounts
  add constraint bank_accounts_account_type_check
  check (account_type in ('checking', 'savings', 'cash', 'crypto', 'other'));
alter table public.bank_accounts
  add constraint bank_accounts_source_name_length_check
  check (source_name is null or char_length(btrim(source_name)) between 1 and 100);

create or replace function public.delete_bank_data(
  p_household_id uuid,
  p_month date default null,
  p_scope text default 'mine',
  p_bank_account_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_start date;
  v_end date;
  v_entries_deleted integer := 0;
  v_transactions_deleted integer := 0;
  v_accounts_deleted integer := 0;
  v_balances_cleared integer := 0;
  v_household_scope boolean := p_scope = 'household';
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_scope is null or p_scope not in ('mine', 'household') then
    raise exception 'Invalid deletion scope' using errcode = '22023';
  end if;
  if p_month is not null and date_trunc('month', p_month)::date <> p_month then
    raise exception 'Month must be the first day of a month' using errcode = '22023';
  end if;

  select h.owner_id into v_owner
  from public.households h
  where h.id = p_household_id;
  if v_owner is null then
    raise exception 'Household not found' using errcode = '42501';
  end if;
  if v_owner <> v_actor and not exists (
    select 1 from public.household_members m
    where m.household_id = p_household_id and m.user_id = v_actor
  ) then
    raise exception 'Household membership required' using errcode = '42501';
  end if;
  if v_household_scope and v_owner <> v_actor then
    raise exception 'Only the household owner can delete all household banking data' using errcode = '42501';
  end if;
  if p_bank_account_id is not null and not exists (
    select 1 from public.bank_accounts a
    where a.id = p_bank_account_id and a.household_id = p_household_id
      and (v_household_scope or a.owner_user_id = v_actor)
  ) then
    raise exception 'Bank account not found or not owned by this user' using errcode = '42501';
  end if;
  if not v_household_scope and not exists (
    select 1 from public.bank_accounts a
    where a.household_id = p_household_id and a.owner_user_id = v_actor
  ) and v_owner <> v_actor then
    raise exception 'No bank accounts owned by this user' using errcode = '42501';
  end if;

  if p_month is not null then
    v_start := p_month;
    v_end := (p_month + interval '1 month')::date;
  end if;

  delete from public.entries e
  where e.bank_transaction_id in (
    select t.id
    from public.bank_transactions t
    join public.bank_accounts a on a.id = t.bank_account_id
    where t.household_id = p_household_id
      and (v_household_scope or a.owner_user_id = v_actor)
      and (p_bank_account_id is null or a.id = p_bank_account_id)
      and (p_month is null or (t.transaction_date >= v_start and t.transaction_date < v_end))
  );
  get diagnostics v_entries_deleted = row_count;

  if p_month is not null then
    delete from public.bank_transactions t
    using public.bank_accounts a
    where a.id = t.bank_account_id
      and a.household_id = p_household_id
      and (v_household_scope or a.owner_user_id = v_actor)
      and (p_bank_account_id is null or a.id = p_bank_account_id)
      and t.household_id = p_household_id
      and t.transaction_date >= v_start and t.transaction_date < v_end;
    get diagnostics v_transactions_deleted = row_count;

    update public.bank_accounts a
    set balance_cents = null, balance_as_of = null, updated_at = now()
    where a.household_id = p_household_id
      and (v_household_scope or a.owner_user_id = v_actor)
      and (p_bank_account_id is null or a.id = p_bank_account_id)
      and a.balance_as_of >= v_start::timestamptz
      and a.balance_as_of < v_end::timestamptz;
    get diagnostics v_balances_cleared = row_count;
  else
    select count(*) into v_transactions_deleted
    from public.bank_transactions t
    join public.bank_accounts a on a.id = t.bank_account_id
    where t.household_id = p_household_id
      and (v_household_scope or a.owner_user_id = v_actor)
      and (p_bank_account_id is null or a.id = p_bank_account_id);

    delete from public.bank_accounts a
    where a.household_id = p_household_id
      and (v_household_scope or a.owner_user_id = v_actor)
      and (p_bank_account_id is null or a.id = p_bank_account_id);
    get diagnostics v_accounts_deleted = row_count;
  end if;

  return jsonb_build_object(
    'accounts_deleted', v_accounts_deleted,
    'transactions_deleted', v_transactions_deleted,
    'entries_deleted', v_entries_deleted,
    'balances_cleared', v_balances_cleared,
    'scope', p_scope
  );
end;
$$;

revoke all on function public.delete_bank_data(uuid, date, text, uuid) from public, anon;
grant execute on function public.delete_bank_data(uuid, date, text, uuid) to authenticated;
