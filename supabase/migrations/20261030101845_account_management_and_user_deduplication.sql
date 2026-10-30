-- Manual accounts: editable descriptive fields only. Existing owner RLS applies.
grant update(name,source_name,account_type,owner_person_id) on public.bank_accounts to authenticated;

create function public.prevent_repeated_user_bank_import()
returns trigger language plpgsql security invoker set search_path='' as $$
declare owner_id uuid;
begin
 select a.owner_user_id into owner_id from public.bank_accounts a where a.id=new.bank_account_id and a.household_id=new.household_id;
 if owner_id is null then raise exception 'Bank account not accessible' using errcode='42501'; end if;
 -- Serialize imports by account owner, including concurrent imports into different accounts.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text,0));
 if coalesce(new.source_metadata->'duplicate_override','false'::jsonb)<>'true'::jsonb and exists(
  select 1 from public.bank_transactions t join public.bank_accounts a on a.id=t.bank_account_id
  where a.owner_user_id=owner_id and t.bank_account_id<>new.bank_account_id and t.fingerprint=new.fingerprint
 ) then return null; end if;
 return new;
end;
$$;
revoke all on function public.prevent_repeated_user_bank_import() from public,anon,authenticated;
create trigger prevent_repeated_user_bank_import before insert on public.bank_transactions
 for each row execute function public.prevent_repeated_user_bank_import();

-- Explicit user action: combine two representations of the same real account.
-- Privilege is needed to move bank rows and preserve settlement links atomically.
create function public.merge_import_accounts(p_source_id uuid,p_target_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 s public.bank_accounts%rowtype; t public.bank_accounts%rowtype;
 pair record; source_entry uuid; target_entry uuid; moved integer; duplicates integer:=0;
begin
 if auth.uid() is null or p_source_id=p_target_id then raise exception 'Choose two different accounts' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 perform 1 from public.bank_accounts where id in(p_source_id,p_target_id) order by id for update;
 select * into s from public.bank_accounts where id=p_source_id;
 select * into t from public.bank_accounts where id=p_target_id;
 if s.id is null or t.id is null or s.owner_user_id<>auth.uid() or t.owner_user_id<>auth.uid()
  or s.household_id<>t.household_id or s.provider<>'import' or t.provider<>'import'
  or not exists(select 1 from public.household_members m where m.household_id=s.household_id and m.user_id=auth.uid()) then
  raise exception 'Only your manual accounts in the same household can be merged' using errcode='42501';
 end if;
 if s.currency<>t.currency or s.account_type<>t.account_type then
  raise exception 'Correct the account types first; currencies and types must match' using errcode='23514';
 end if;
 for pair in select a.id source_id,b.id target_id from public.bank_transactions a join public.bank_transactions b on b.bank_account_id=t.id and b.fingerprint=a.fingerprint where a.bank_account_id=s.id loop
  select id into source_entry from public.entries where bank_transaction_id=pair.source_id;
  select id into target_entry from public.entries where bank_transaction_id=pair.target_id;
  if source_entry is not null and target_entry is not null then
   if exists(select 1 from public.household_obligation_settlements where entry_id=source_entry) then
    if exists(select 1 from public.household_obligation_settlements where entry_id=target_entry) then
     raise exception 'Both duplicate operations settle bills. Unlink one before merging.' using errcode='23514';
    end if;
    if not exists(select 1 from public.entries where id=target_entry and kind='expense' and flow_type='standard' and entry_date<=(current_timestamp at time zone 'Europe/Paris')::date) then
     raise exception 'Correct the destination expense before preserving its bill link' using errcode='23514';
    end if;
    update public.household_obligation_settlements set entry_id=target_entry where entry_id=source_entry;
   end if;
   delete from public.entries where id=source_entry;
  elsif source_entry is not null then
   update public.entries set bank_transaction_id=pair.target_id where id=source_entry;
  end if;
  delete from public.bank_transactions where id=pair.source_id;
  duplicates:=duplicates+1;
 end loop;
 update public.bank_transactions set bank_account_id=t.id where bank_account_id=s.id;
 get diagnostics moved=row_count;
 if s.balance_cents is not null and (t.balance_as_of is null or s.balance_as_of>t.balance_as_of) then
  update public.bank_accounts set balance_cents=s.balance_cents,balance_as_of=s.balance_as_of where id=t.id;
 end if;
 delete from public.bank_accounts where id=s.id;
 return jsonb_build_object('moved',moved,'duplicates',duplicates,'account_id',t.id);
end;
$$;
revoke all on function public.merge_import_accounts(uuid,uuid) from public,anon;
grant execute on function public.merge_import_accounts(uuid,uuid) to authenticated;
