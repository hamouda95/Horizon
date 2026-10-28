-- Household personas let families attribute income and spending without
-- requiring every child or partner to create an account.
create table public.household_people (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 60),
 relationship text not null default 'other' check (relationship in ('self','partner','child','other')),
 is_primary boolean not null default false,
 active boolean not null default true,
 sort_order smallint not null default 0 check (sort_order between 0 and 100),
 created_at timestamptz not null default now(),
 unique (id, household_id)
);

create unique index household_people_one_primary_idx
 on public.household_people(household_id) where is_primary;
create index household_people_household_order_idx
 on public.household_people(household_id, active, sort_order, name);

alter table public.household_people enable row level security;
revoke all on public.household_people from public, anon, authenticated;
grant select, insert, update, delete on public.household_people to authenticated;

create policy household_people_members_read on public.household_people
 for select to authenticated using (
  exists (select 1 from public.household_members m
   where m.household_id=household_people.household_id and m.user_id=(select auth.uid()))
 );
create policy household_people_owner_insert on public.household_people
 for insert to authenticated with check (
  exists (select 1 from public.household_members m
   where m.household_id=household_people.household_id and m.user_id=(select auth.uid()) and m.role='owner')
 );
create policy household_people_owner_update on public.household_people
 for update to authenticated using (
  exists (select 1 from public.household_members m
   where m.household_id=household_people.household_id and m.user_id=(select auth.uid()) and m.role='owner')
 ) with check (
  exists (select 1 from public.household_members m
   where m.household_id=household_people.household_id and m.user_id=(select auth.uid()) and m.role='owner')
 );
create policy household_people_owner_delete on public.household_people
 for delete to authenticated using (
  exists (select 1 from public.household_members m
   where m.household_id=household_people.household_id and m.user_id=(select auth.uid()) and m.role='owner')
 );

-- Add the owner as the initial household person; do not import profile data
-- such as a full legal name into shared household records.
insert into public.household_people(household_id,name,relationship,is_primary,sort_order)
select h.id,'Moi','self',true,0 from public.households h
where not exists (select 1 from public.household_people p where p.household_id=h.id);

alter table public.entries add column person_id uuid
 references public.household_people(id) on delete set null;
create index entries_household_person_date_idx
 on public.entries(household_id,person_id,entry_date);

create function public.check_entry_person_household()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.person_id is not null and not exists (
  select 1 from public.household_people p
  where p.id=new.person_id and p.household_id=new.household_id
 ) then
  raise exception 'Person does not belong to this household' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function public.check_entry_person_household() from public,anon,authenticated;
create trigger entries_check_person_household
 before insert or update of person_id,household_id on public.entries
 for each row execute function public.check_entry_person_household();

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
  select p_bank_account_id as bank_account_id,v_household_id as household_id,t.external_id,t.fingerprint,t.transaction_date,t.value_date,btrim(t.label) as label,t.amount_cents,upper(t.currency) as currency,t.category_id,t.subcategory_id,t.person_id
  from jsonb_to_recordset(p_transactions) as t(external_id text,fingerprint text,transaction_date date,value_date date,label text,amount_cents bigint,currency text,category_id uuid,subcategory_id uuid,person_id uuid)
 ), inserted as (
  insert into public.bank_transactions(household_id,bank_account_id,external_id,fingerprint,transaction_date,value_date,label,amount_cents,currency)
  select household_id,bank_account_id,external_id,fingerprint,transaction_date,value_date,label,amount_cents,currency from parsed
  on conflict do nothing
  returning id,household_id,transaction_date,label,amount_cents
 ), entries_added as (
  insert into public.entries(household_id,bank_transaction_id,category_id,kind,label,amount_cents,entry_date,frequency,income_allocation,expense_type,subcategory_id,person_id)
  select i.household_id,i.id,p.category_id,case when i.amount_cents>0 then 'income' else 'expense' end,i.label,abs(i.amount_cents),i.transaction_date,'monthly','calendar',null,p.subcategory_id,p.person_id
  from inserted i
  join public.bank_transactions bt on bt.id=i.id
  join lateral (select p.category_id,p.subcategory_id,p.person_id from parsed p where p.fingerprint=bt.fingerprint limit 1) p on true
  returning bank_transaction_id
 ) select count(*) into v_imported from entries_added;
 return jsonb_build_object('imported',v_imported,'duplicates',greatest(v_requested-v_imported,0));
end;
$function$;

