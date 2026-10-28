create or replace function public.import_bank_transactions(p_bank_account_id uuid,p_transactions jsonb)
returns jsonb
language plpgsql
set search_path to 'public','pg_temp'
as $function$
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
  select p_bank_account_id as bank_account_id,v_household_id as household_id,t.external_id,t.fingerprint,t.transaction_date,t.value_date,btrim(t.label) as label,t.amount_cents,upper(t.currency) as currency,t.category_id,t.subcategory_id
  from jsonb_to_recordset(p_transactions) as t(external_id text,fingerprint text,transaction_date date,value_date date,label text,amount_cents bigint,currency text,category_id uuid,subcategory_id uuid)
 ), inserted as (
  insert into public.bank_transactions(household_id,bank_account_id,external_id,fingerprint,transaction_date,value_date,label,amount_cents,currency)
  select household_id,bank_account_id,external_id,fingerprint,transaction_date,value_date,label,amount_cents,currency from parsed
  on conflict do nothing
  returning id,household_id,transaction_date,label,amount_cents
 ), entries_added as (
  insert into public.entries(household_id,bank_transaction_id,category_id,kind,label,amount_cents,entry_date,frequency,income_allocation,expense_type,subcategory_id)
  select i.household_id,i.id,p.category_id,case when i.amount_cents>0 then 'income' else 'expense' end,i.label,abs(i.amount_cents),i.transaction_date,'monthly','calendar',null,p.subcategory_id
  from inserted i
  join public.bank_transactions bt on bt.id=i.id
  join lateral (select p.category_id,p.subcategory_id from parsed p where p.fingerprint=bt.fingerprint limit 1) p on true
  returning bank_transaction_id
 ) select count(*) into v_imported from entries_added;
 return jsonb_build_object('imported',v_imported,'duplicates',greatest(v_requested-v_imported,0));
end;
$function$;
