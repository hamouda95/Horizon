create or replace function public.import_bank_transactions(
  p_bank_account_id uuid,
  p_transactions jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_household_id uuid;
  v_requested integer;
  v_imported integer;
begin
  if jsonb_typeof(p_transactions) is distinct from 'array' then
    raise exception 'Transactions must be an array' using errcode = '22023';
  end if;

  v_requested := jsonb_array_length(p_transactions);
  if v_requested > 500 then
    raise exception 'Maximum 500 transactions per batch' using errcode = '22023';
  end if;

  select a.household_id into v_household_id
  from public.bank_accounts a
  where a.id = p_bank_account_id;

  if v_household_id is null then
    raise exception 'Bank account not found' using errcode = '42501';
  end if;

  with parsed as (
    select
      p_bank_account_id as bank_account_id,
      v_household_id as household_id,
      t.external_id,
      t.fingerprint,
      t.transaction_date,
      t.value_date,
      btrim(t.label) as label,
      t.amount_cents,
      upper(t.currency) as currency,
      t.category_id,
      t.subcategory_id,
      t.person_id
    from jsonb_to_recordset(p_transactions) as t(
      external_id text,
      fingerprint text,
      transaction_date date,
      value_date date,
      label text,
      amount_cents bigint,
      currency text,
      category_id uuid,
      subcategory_id uuid,
      person_id uuid
    )
  ), inserted as (
    insert into public.bank_transactions (
      household_id, bank_account_id, external_id, fingerprint,
      transaction_date, value_date, label, amount_cents, currency
    )
    select
      household_id, bank_account_id, external_id, fingerprint,
      transaction_date, value_date, label, amount_cents, currency
    from parsed
    on conflict do nothing
    returning id, household_id, transaction_date, label, amount_cents
  ), resolved as (
    select
      i.id, i.household_id, i.transaction_date, i.label, i.amount_cents,
      p.category_id, p.subcategory_id, p.person_id
    from inserted i
    join lateral (
      select parsed.category_id, parsed.subcategory_id, parsed.person_id
      from parsed
      join public.bank_transactions bt
        on bt.bank_account_id = parsed.bank_account_id
       and bt.fingerprint = parsed.fingerprint
      where bt.id = i.id
      limit 1
    ) p on true

    union all

    select
      bt.id, bt.household_id, bt.transaction_date, bt.label, bt.amount_cents,
      p.category_id, p.subcategory_id, p.person_id
    from parsed p
    join public.bank_transactions bt
      on bt.bank_account_id = p.bank_account_id
     and bt.fingerprint = p.fingerprint
    where not exists (select 1 from inserted i where i.id = bt.id)
  ), entries_added as (
    insert into public.entries (
      household_id, bank_transaction_id, category_id, kind, label,
      amount_cents, entry_date, frequency, income_allocation,
      expense_type, subcategory_id, person_id
    )
    select
      r.household_id, r.id, r.category_id,
      case when r.amount_cents > 0 then 'income' else 'expense' end,
      r.label, abs(r.amount_cents), r.transaction_date,
      'monthly', 'calendar', null, r.subcategory_id, r.person_id
    from resolved r
    where not exists (
      select 1 from public.entries e where e.bank_transaction_id = r.id
    )
    on conflict (bank_transaction_id) where bank_transaction_id is not null do nothing
    returning bank_transaction_id
  )
  select count(*) into v_imported from entries_added;

  return jsonb_build_object(
    'imported', v_imported,
    'duplicates', greatest(v_requested - v_imported, 0)
  );
end;
$$;

revoke all on function public.import_bank_transactions(uuid, jsonb) from public, anon;
grant execute on function public.import_bank_transactions(uuid, jsonb) to authenticated;
