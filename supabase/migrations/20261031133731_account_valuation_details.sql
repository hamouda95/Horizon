-- A valuation is a dated asset snapshot, never an income transaction.
alter table public.bank_accounts add column valuation_details jsonb;
create function public.valid_asset_valuation(v jsonb) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare k text;n numeric;
begin
 if v is null then return true;end if;
 if jsonb_typeof(v)<>'object' or octet_length(v::text)>16000 or v->>'kind' is distinct from 'investment' or v->>'currency' is distinct from 'EUR' then return false;end if;
 if v->>'asOf' is null or (v->>'asOf')::date>current_date or v->>'grossCents' is null then return false;end if;
 for k in select unnest(array['grossCents','estimatedNetCents','lockedCents','gainLossCents']) loop
  if v->>k is not null then if jsonb_typeof(v->k)<>'number' then return false;end if;n:=(v->>k)::numeric;if n<>trunc(n) or abs(n)>100000000000 or (k<>'gainLossCents' and n<0) then return false;end if;end if;
 end loop;
 if (v->>'lockedCents')::numeric>(v->>'grossCents')::numeric then return false;end if;
 return true;
exception when others then return false;
end;
$$;
revoke all on function public.valid_asset_valuation(jsonb) from public,anon;
grant execute on function public.valid_asset_valuation(jsonb) to authenticated;
alter table public.bank_accounts add constraint bank_accounts_valuation_valid check(public.valid_asset_valuation(valuation_details));
alter table public.bank_accounts add constraint bank_accounts_valuation_consistent check(valuation_details is null or (account_type in('investment','savings','crypto','other') and balance_cents is not null and balance_as_of is not null and currency=valuation_details->>'currency' and balance_cents=(valuation_details->>'grossCents')::bigint and balance_as_of::date=(valuation_details->>'asOf')::date));
create function public.clear_outdated_asset_valuation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.valuation_details is not null and new.valuation_details is not distinct from old.valuation_details and (new.balance_cents is distinct from old.balance_cents or new.balance_as_of::date is distinct from old.balance_as_of::date or new.account_type is distinct from old.account_type) then new.valuation_details:=null;end if;
 return new;
end;
$$;
revoke all on function public.clear_outdated_asset_valuation() from public,anon;
create trigger bank_accounts_clear_outdated_valuation before update on public.bank_accounts for each row execute function public.clear_outdated_asset_valuation();
create or replace view public.financial_accounts with(security_invoker=true) as
 select a.id,a.household_id,a.owner_user_id,a.provider,a.external_account_id,a.provider_item_id,a.name,a.account_type,a.currency,a.balance_cents,a.balance_as_of,a.status,a.created_at,a.updated_at,a.source_name,a.owner_person_id,case when a.balance_cents is null then null else a.balance_cents+coalesce((select sum(case when e.kind='income' then e.amount_cents else -e.amount_cents end)
 from public.entries e left join public.bank_transactions t on t.id=e.bank_transaction_id
 where e.household_id=a.household_id and coalesce(t.bank_account_id,e.account_id)=a.id
 and e.entry_date>(a.balance_as_of at time zone 'Europe/Paris')::date and e.entry_date<=(current_timestamp at time zone 'Europe/Paris')::date),0) end::bigint as effective_balance_cents,a.valuation_details
 from public.bank_accounts a;
grant update(valuation_details) on public.bank_accounts to authenticated;
