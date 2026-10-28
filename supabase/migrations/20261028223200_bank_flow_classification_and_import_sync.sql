alter table public.entries
 add column flow_type text not null default 'standard',
 add constraint entries_flow_type_check check (flow_type in ('standard','transfer','refund','savings','review'));

alter table public.bank_transactions
 add column source_metadata jsonb not null default '{}'::jsonb,
 add constraint bank_transactions_source_metadata_object
 check (jsonb_typeof(source_metadata)='object');

alter table public.household_merchant_rules
 add column flow_type text,
 add constraint household_merchant_rules_flow_type_check
 check (flow_type is null or flow_type in ('standard','transfer','refund','savings','review'));

create or replace function public.import_bank_transactions(p_bank_account_id uuid,p_transactions jsonb)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
 v_household_id uuid;
 v_requested integer;
 v_imported integer;
begin
 if jsonb_typeof(p_transactions) is distinct from 'array' then
  raise exception 'Transactions must be an array' using errcode='22023';
 end if;
 v_requested:=jsonb_array_length(p_transactions);
 if v_requested>500 then raise exception 'Maximum 500 transactions per batch' using errcode='22023'; end if;
 select a.household_id into v_household_id from public.bank_accounts a where a.id=p_bank_account_id;
 if v_household_id is null then raise exception 'Bank account not found' using errcode='42501'; end if;
 with parsed as (
  select p_bank_account_id as bank_account_id,v_household_id as household_id,
   t.external_id,t.fingerprint,t.transaction_date,t.value_date,btrim(t.label) as label,
   t.amount_cents,upper(t.currency) as currency,t.category_id,t.subcategory_id,t.person_id,
   coalesce(nullif(t.flow_type,''),case when t.amount_cents>0 then 'review' else 'standard' end) as flow_type,
   case when jsonb_typeof(t.source_metadata)='object' then t.source_metadata else '{}'::jsonb end as source_metadata
  from jsonb_to_recordset(p_transactions) as t(
   external_id text,fingerprint text,transaction_date date,value_date date,label text,
   amount_cents bigint,currency text,category_id uuid,subcategory_id uuid,person_id uuid,
   flow_type text,source_metadata jsonb
  )
 ), inserted as (
  insert into public.bank_transactions(
   household_id,bank_account_id,external_id,fingerprint,transaction_date,value_date,
   label,amount_cents,currency,source_metadata
  )
  select household_id,bank_account_id,external_id,fingerprint,transaction_date,value_date,
   label,amount_cents,currency,source_metadata
  from parsed
  on conflict do nothing
  returning id,household_id,bank_account_id,fingerprint
 ), eligible as (
  select i.id,i.household_id,p.transaction_date,p.value_date,p.label,p.amount_cents,
   p.category_id,p.subcategory_id,p.person_id,p.flow_type
  from inserted i
  join parsed p on p.household_id=i.household_id
   and p.bank_account_id=i.bank_account_id and p.fingerprint=i.fingerprint
  union all
  select bt.id,bt.household_id,bt.transaction_date,bt.value_date,bt.label,bt.amount_cents,
   p.category_id,p.subcategory_id,p.person_id,p.flow_type
  from parsed p
  join public.bank_transactions bt
   on bt.bank_account_id=p.bank_account_id
   and bt.household_id=p.household_id
   and bt.fingerprint=p.fingerprint
  where not exists (
   select 1 from public.entries e
   where e.bank_transaction_id=bt.id
  )
, entries_added as (
  insert into public.entries(
   household_id,bank_transaction_id,category_id,kind,label,amount_cents,entry_date,
   frequency,income_allocation,expense_type,subcategory_id,person_id,flow_type
  )
  select i.household_id,i.id,i.category_id,
   case when i.amount_cents>0 then 'income' else 'expense' end,
   i.label,abs(i.amount_cents),i.transaction_date,'monthly','calendar',null,
   i.subcategory_id,i.person_id,i.flow_type
  from eligible i
  on conflict (bank_transaction_id) where bank_transaction_id is not null do nothing
  returning bank_transaction_id
 )
 select count(*) into v_imported from entries_added;
 return jsonb_build_object('imported',v_imported,'duplicates',greatest(v_requested-v_imported,0));
end;
$$;
revoke all on function public.import_bank_transactions(uuid,jsonb) from public,anon;
grant execute on function public.import_bank_transactions(uuid,jsonb) to authenticated;
