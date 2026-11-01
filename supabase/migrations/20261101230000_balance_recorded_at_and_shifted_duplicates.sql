-- A balance typed on day D already contains the operations the bank showed at that moment, but an
-- operation dated D can arrive in a later import (Fortuneo books card payments the next morning).
-- Such an operation, received on a later day than the balance was recorded, is now added to it.
alter table public.bank_accounts add column balance_recorded_at timestamptz;
update public.bank_accounts set balance_recorded_at=greatest(created_at,updated_at) where balance_cents is not null;

create function public.stamp_balance_recorded_at() returns trigger language plpgsql set search_path='' as $$
begin
 if new.balance_cents is null then new.balance_recorded_at:=null;
 elsif tg_op='INSERT' or new.balance_cents is distinct from old.balance_cents or new.balance_as_of is distinct from old.balance_as_of then new.balance_recorded_at:=now();
 else new.balance_recorded_at:=old.balance_recorded_at;end if;
 return new;
end;
$$;
create trigger bank_accounts_stamp_balance_recorded_at before insert or update on public.bank_accounts for each row execute function public.stamp_balance_recorded_at();

create or replace view public.financial_accounts with(security_invoker=true) as
 select a.id,a.household_id,a.owner_user_id,a.provider,a.external_account_id,a.provider_item_id,a.name,a.account_type,a.currency,a.balance_cents,a.balance_as_of,a.status,a.created_at,a.updated_at,a.source_name,a.owner_person_id,case when a.balance_cents is null then null else a.balance_cents+coalesce((select sum(case when e.kind='income' then e.amount_cents else -e.amount_cents end)
 from public.entries e left join public.bank_transactions t on t.id=e.bank_transaction_id
 where e.household_id=a.household_id and coalesce(t.bank_account_id,e.account_id)=a.id
 and e.entry_date<=(current_timestamp at time zone 'Europe/Paris')::date
 and (e.entry_date>(a.balance_as_of at time zone 'Europe/Paris')::date
  or (e.entry_date=(a.balance_as_of at time zone 'Europe/Paris')::date and a.balance_recorded_at is not null
   and (coalesce(t.created_at,e.created_at) at time zone 'Europe/Paris')::date>(a.balance_recorded_at at time zone 'Europe/Paris')::date))),0) end::bigint as effective_balance_cents,a.valuation_details,a.row_version
 from public.bank_accounts a;

-- The same operation exported twice with a booking date one day apart ("CARTE 19/09 …" on the 20th
-- in one file, on the 21st in the other). Each pair keeps one line, chosen by the user.
create function public.resolve_bank_shifted_duplicates(p_household_id uuid,p_keep_ids uuid[],p_remove_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$
declare kept public.bank_transactions%rowtype; removed public.bank_transactions%rowtype; keep_entry uuid; remove_entry uuid; n integer:=0; i integer;
begin
 if auth.uid() is null or coalesce(cardinality(p_keep_ids),0) not between 1 and 250 or cardinality(p_keep_ids)<>coalesce(cardinality(p_remove_ids),0) then raise exception 'Choose up to 250 pairs' using errcode='22023';end if;
 if not exists(select 1 from public.household_members where household_id=p_household_id and user_id=auth.uid()) then raise exception 'Membership required' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 for i in 1..cardinality(p_keep_ids) loop
  select t.* into kept from public.bank_transactions t join public.bank_accounts a on a.id=t.bank_account_id where t.id=p_keep_ids[i] and t.household_id=p_household_id and a.owner_user_id=auth.uid() for update of t;
  select t.* into removed from public.bank_transactions t where t.id=p_remove_ids[i] and t.household_id=p_household_id for update;
  if kept.id is null or removed.id is null or kept.id=removed.id then raise exception 'Operation inaccessible' using errcode='42501';end if;
  if removed.bank_account_id<>kept.bank_account_id or removed.amount_cents<>kept.amount_cents or removed.currency<>kept.currency
   or abs(removed.transaction_date-kept.transaction_date)<>1
   or regexp_replace(removed.canonical_key,'^[^|]*[|]','')<>regexp_replace(kept.canonical_key,'^[^|]*[|]','') then raise exception 'These operations are not the same' using errcode='22023';end if;
  select id into keep_entry from public.entries where bank_transaction_id=kept.id;
  select id into remove_entry from public.entries where bank_transaction_id=removed.id;
  if remove_entry is not null and keep_entry is null then
   update public.entries set bank_transaction_id=kept.id,entry_date=kept.transaction_date where id=remove_entry;
  elsif remove_entry is not null then
   if exists(select 1 from public.household_obligation_settlements where entry_id=remove_entry) then
    if exists(select 1 from public.household_obligation_settlements where entry_id=keep_entry) then raise exception 'Unlink conflicting bill settlements first' using errcode='23514';end if;
    update public.household_obligation_settlements set entry_id=keep_entry where entry_id=remove_entry;
   end if;
   delete from public.entries where id=remove_entry;
  end if;
  update public.bank_transactions set source_metadata=source_metadata||jsonb_build_object('deduplicated_references',coalesce(source_metadata->'deduplicated_references','[]'::jsonb)||case when removed.external_id is null then '[]'::jsonb else jsonb_build_array(removed.external_id) end) where id=kept.id;
  delete from public.bank_transactions where id=removed.id;n:=n+1;
 end loop;
 return n;
end;
$$;
revoke all on function public.resolve_bank_shifted_duplicates(uuid,uuid[],uuid[]) from public,anon;
grant execute on function public.resolve_bank_shifted_duplicates(uuid,uuid[],uuid[]) to authenticated;
