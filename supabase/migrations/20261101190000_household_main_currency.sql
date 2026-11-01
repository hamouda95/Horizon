-- Main currency per household (EUR, TND, USD…). The budget, manual entries and imported
-- operations stay in that single currency: amounts are integer hundredths and are never
-- converted. Other currencies remain possible for accounts held as assets (multi-currency).
alter table public.households drop constraint if exists households_supported_currency_check;
alter table public.households add constraint households_supported_currency_check
 check (currency in ('EUR','TND','USD','GBP','CHF','CAD','MAD','DZD','SAR','AED','QAR','TRY','JPY','CNY','XOF','XAF','LYD','EGP')) not valid;

CREATE OR REPLACE FUNCTION public.check_bank_transaction_currency()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if new.currency is distinct from (select h.currency from public.households h where h.id=new.household_id) or not exists (
  select 1 from public.bank_accounts a
  where a.id=new.bank_account_id and a.household_id=new.household_id and a.currency=new.currency
 ) then
  raise exception 'Only transactions in the household main currency, on an account in that currency, can enter the budget' using errcode='23514';
 end if;
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.check_entry_bank_currency()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if new.bank_transaction_id is not null and not exists (
  select 1 from public.bank_transactions t
  where t.id=new.bank_transaction_id and t.household_id=new.household_id and t.currency=(select h.currency from public.households h where h.id=new.household_id)
 ) then
  raise exception 'The linked bank transaction must be in the household main currency and in this household' using errcode='23514';
 end if;
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_entry_finance_links()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare linked_account uuid; old_loan uuid;
begin
 if tg_op<>'INSERT' then old_loan:=old.loan_id;end if;
 -- Stable lock order serializes concurrent repayments and edits of the same receivable.
 perform 1 from public.household_loans where id in(old_loan,case when tg_op<>'DELETE' then new.loan_id end) order by id for update;
 if tg_op='DELETE' then return old;end if;
 if new.bank_transaction_id is not null then
  select bank_account_id into linked_account from public.bank_transactions where id=new.bank_transaction_id and household_id=new.household_id;
  if new.account_id is not null and new.account_id is distinct from linked_account then raise exception 'An imported operation must stay on its source account' using errcode='23514';end if;
 end if;
 if new.loan_id is not null then
  if not exists(select 1 from public.household_loans where id=new.loan_id and household_id=new.household_id and (opened_on is null or opened_on<=new.entry_date)) then raise exception 'Choose a loan from this household dated before the operation' using errcode='23514';end if;
  if new.payment_method is null then raise exception 'Choose the loan payment method' using errcode='23514';end if;
  new.income_allocation:='calendar';new.frequency:='monthly';new.expense_type:=null;
 end if;
 if new.payment_method='cash' and coalesce(new.account_id,linked_account) is not null and not exists(select 1 from public.bank_accounts where id=coalesce(new.account_id,linked_account) and account_type='cash') then raise exception 'A cash payment requires a cash account' using errcode='23514';end if;
 if new.account_id is not null and not exists(select 1 from public.bank_accounts where id=new.account_id and household_id=new.household_id and currency=(select h.currency from public.households h where h.id=new.household_id)) then raise exception 'Manual entries require an account in the household main currency' using errcode='23514';end if;
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.configure_household_with_accounts(p_household_id uuid, p_name text, p_income_types jsonb, p_expense_types jsonb, p_people jsonb, p_accounts jsonb, p_budget jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare home_id uuid; account jsonb; person_id uuid; amount bigint;
begin
 if jsonb_typeof(p_accounts) is distinct from 'array' or jsonb_array_length(p_accounts)>50 then raise exception 'Expected up to 50 starting accounts' using errcode='22023';end if;
 if p_household_id is not null and jsonb_array_length(p_accounts)>0 then raise exception 'Starting accounts are only accepted when creating a household' using errcode='22023';end if;
 if p_budget is not null and (jsonb_typeof(p_budget)<>'object' or p_household_id is not null) then raise exception 'Initial budget only applies to a new household' using errcode='22023';end if;
 home_id:=public.configure_household(p_household_id,p_name,p_income_types,p_expense_types,p_people);
 select id into person_id from public.household_people where household_id=home_id and is_primary;
 for account in select value from jsonb_array_elements(p_accounts) loop
  amount:=(account->>'balance_cents')::bigint;
  if abs(amount::numeric)>100000000000 or (account->>'balance_date')::date>(current_timestamp at time zone 'Europe/Paris')::date then raise exception 'Invalid opening balance or date' using errcode='23514';end if;
  if account->>'account_type'='credit' and amount>0 then raise exception 'A debt is recorded as a negative balance' using errcode='23514';end if;
  if account->>'account_type' in('cash','investment','crypto') and amount<0 then raise exception 'Cash and asset valuations must be nonnegative' using errcode='23514';end if;
  insert into public.bank_accounts(household_id,owner_user_id,owner_person_id,provider,external_account_id,name,source_name,account_type,currency,balance_cents,balance_as_of)
   values(home_id,auth.uid(),person_id,'import',gen_random_uuid()::text,btrim(account->>'name'),nullif(btrim(account->>'source_name'),''),account->>'account_type',(select h.currency from public.households h where h.id=home_id),amount,
    case when amount is not null then ((account->>'balance_date')::date::timestamp+interval '12 hours') at time zone 'UTC' else null end);
 end loop;
 if p_budget is not null then insert into public.monthly_budgets(household_id,month,income_cents,expense_cents) values(home_id,(p_budget->>'month')::date,(p_budget->>'income_cents')::bigint,(p_budget->>'expense_cents')::bigint);end if;
 return home_id;
end;
$function$;

-- Changes the main currency. Amounts are not converted. With p_relabel, the accounts and
-- imported operations recorded in the previous main currency are relabelled with the new one
-- (for a household created with the wrong currency); declared investment valuations keep theirs.
create function public.set_household_currency(p_household_id uuid,p_currency text,p_relabel boolean default false)
returns text language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'Unsupported currency' using errcode='22023';end if;
 select currency into previous from public.households where id=p_household_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Only the household owner can change its currency' using errcode='42501';end if;
 if previous=p_currency then return p_currency;end if;
 update public.households set currency=p_currency where id=p_household_id;
 if p_relabel then
  update public.bank_accounts set currency=p_currency where household_id=p_household_id and currency=previous and valuation_details is null;
  update public.bank_transactions t set currency=p_currency where t.household_id=p_household_id and t.currency=previous
   and exists(select 1 from public.bank_accounts a where a.id=t.bank_account_id and a.currency=p_currency);
 end if;
 return p_currency;
end;
$$;
revoke all on function public.set_household_currency(uuid,text,boolean) from public,anon;
grant execute on function public.set_household_currency(uuid,text,boolean) to authenticated;
