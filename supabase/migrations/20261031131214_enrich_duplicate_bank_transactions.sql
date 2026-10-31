-- Allow authenticated account managers to fill missing source details only.
-- Financial identity and classification remain unchanged.
revoke update on public.bank_transactions from authenticated;
grant update(value_date,source_metadata) on public.bank_transactions to authenticated;
create policy bank_transactions_update_account_owner on public.bank_transactions
for update to authenticated
using (exists(select 1 from public.bank_accounts a where a.id=bank_transactions.bank_account_id and a.household_id=bank_transactions.household_id and (a.owner_user_id=(select auth.uid()) or exists(select 1 from public.households h where h.id=a.household_id and h.owner_id=(select auth.uid())))))
with check (exists(select 1 from public.bank_accounts a where a.id=bank_transactions.bank_account_id and a.household_id=bank_transactions.household_id and (a.owner_user_id=(select auth.uid()) or exists(select 1 from public.households h where h.id=a.household_id and h.owner_id=(select auth.uid())))));

create or replace function public.prevent_repeated_user_bank_import()
returns trigger language plpgsql security invoker set search_path='' as $$
declare owner_id uuid; identity text;
begin
 select a.owner_user_id into owner_id from public.bank_accounts a where a.id=new.bank_account_id and a.household_id=new.household_id;
 if owner_id is null then raise exception 'Bank account not accessible' using errcode='42501';end if;
 if owner_id is distinct from auth.uid() and current_user not in('postgres','service_role') and not exists(select 1 from public.households h where h.id=new.household_id and h.owner_id=auth.uid()) then raise exception 'Account owner permission required' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text,0));
 identity:=public.bank_operation_identity(new.transaction_date,new.amount_cents,new.currency,new.label);
 new.occurrence_index:=coalesce((new.source_metadata->>'occurrence_index')::integer,substring(new.fingerprint from '\|occurrence:([0-9]+)$')::integer,1);
 if exists(select 1 from public.bank_transactions t join public.bank_accounts a on a.id=t.bank_account_id
  where a.owner_user_id=owner_id and (
   (t.canonical_key=identity and t.occurrence_index=new.occurrence_index)
   or (new.external_id is not null and t.bank_account_id=new.bank_account_id and (t.external_id=new.external_id or coalesce(t.source_metadata->'deduplicated_references','[]'::jsonb)?new.external_id))
  ) and (t.bank_account_id=new.bank_account_id or coalesce(new.source_metadata->'duplicate_override','false'::jsonb)<>'true'::jsonb)
 ) then
 -- Enrich only the exact operation on this account. Cross-account matches
 -- remain deduplicated but must never receive this account's balance metadata.
 update public.bank_transactions t set
   value_date=coalesce(t.value_date,new.value_date),
   source_metadata=jsonb_strip_nulls(new.source_metadata)||jsonb_strip_nulls(t.source_metadata)
 where t.bank_account_id=new.bank_account_id and t.canonical_key=identity
   and t.occurrence_index=new.occurrence_index
   and (t.value_date is null and new.value_date is not null
     or t.source_metadata is distinct from (jsonb_strip_nulls(new.source_metadata)||jsonb_strip_nulls(t.source_metadata)));
 return null;
 end if;
 return new;
end;
$$;

