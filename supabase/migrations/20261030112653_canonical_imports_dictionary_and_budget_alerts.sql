-- A provider reference identifies a bank record, not a different economic operation.
create function public.bank_operation_identity(p_date date,p_amount bigint,p_currency text,p_label text)
returns text language sql immutable strict security invoker set search_path='' as $$
 select 'row:'||to_char(p_date,'YYYY-MM-DD')||'|'||p_amount::text||'|'||upper(p_currency)||'|'||left(btrim(regexp_replace(lower(regexp_replace(normalize(p_label,NFD),U&'[\0300-\036f]','','g')),'[^a-z0-9]+',' ','g')),400);
$$;
revoke all on function public.bank_operation_identity(date,bigint,text,text) from public,anon;
grant execute on function public.bank_operation_identity(date,bigint,text,text) to authenticated;
alter table public.bank_transactions add column canonical_key text generated always as(public.bank_operation_identity(transaction_date,amount_cents,currency,label)) stored;
alter table public.bank_transactions add column occurrence_index integer not null default 1 check(occurrence_index between 1 and 10000);
update public.bank_transactions set occurrence_index=coalesce(substring(fingerprint from '\|occurrence:([0-9]+)$')::integer,1);
create index bank_transactions_canonical_idx on public.bank_transactions(bank_account_id,canonical_key,occurrence_index);

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
 ) then return null;end if;
 return new;
end;
$$;

create or replace function public.import_bank_transactions(p_bank_account_id uuid,p_transactions jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare household uuid; requested integer; imported integer;
begin
 if jsonb_typeof(p_transactions) is distinct from 'array' then raise exception 'Transactions must be an array' using errcode='22023';end if;
 requested:=jsonb_array_length(p_transactions);
 if requested>500 then raise exception 'Maximum 500 transactions per batch' using errcode='22023';end if;
 select a.household_id into household from public.bank_accounts a where a.id=p_bank_account_id;
 if household is null then raise exception 'Bank account not found' using errcode='42501';end if;
 insert into public.bank_transactions(household_id,bank_account_id,external_id,fingerprint,transaction_date,value_date,label,amount_cents,currency,source_metadata)
 select household,p_bank_account_id,t.external_id,t.fingerprint,t.transaction_date,t.value_date,btrim(t.label),t.amount_cents,upper(t.currency),coalesce(t.source_metadata,'{}'::jsonb)
 from jsonb_to_recordset(p_transactions) t(external_id text,fingerprint text,transaction_date date,value_date date,label text,amount_cents bigint,currency text,source_metadata jsonb)
 on conflict do nothing;
 -- Second statement sees both old rows and newly inserted rows. Preserve any existing correction.
 insert into public.entries(household_id,bank_transaction_id,category_id,kind,label,amount_cents,entry_date,frequency,income_allocation,expense_type,subcategory_id,person_id,flow_type)
 select distinct on(bt.id) household,bt.id,t.category_id,case when bt.amount_cents>0 then 'income' else 'expense' end,bt.label,abs(bt.amount_cents),bt.transaction_date,'monthly','calendar',null,t.subcategory_id,t.person_id,coalesce(nullif(t.flow_type,''),case when bt.amount_cents>0 then 'review' else 'standard' end)
 from jsonb_to_recordset(p_transactions) t(external_id text,fingerprint text,transaction_date date,label text,amount_cents bigint,currency text,category_id uuid,subcategory_id uuid,person_id uuid,flow_type text,source_metadata jsonb)
 join lateral (
  select b.* from public.bank_transactions b where b.bank_account_id=p_bank_account_id and (
   (b.canonical_key=public.bank_operation_identity(t.transaction_date,t.amount_cents,t.currency,t.label)
    and b.occurrence_index=coalesce((t.source_metadata->>'occurrence_index')::integer,substring(t.fingerprint from '\|occurrence:([0-9]+)$')::integer,1))
   or (t.external_id is not null and (b.external_id=t.external_id or coalesce(b.source_metadata->'deduplicated_references','[]'::jsonb)?t.external_id))
  ) order by exists(select 1 from public.entries e where e.bank_transaction_id=b.id) desc,b.created_at,b.id limit 1
 ) bt on true
 where not exists(select 1 from public.entries e where e.bank_transaction_id=bt.id)
 on conflict(bank_transaction_id) where bank_transaction_id is not null do nothing;
 get diagnostics imported=row_count;
 return jsonb_build_object('imported',imported,'duplicates',greatest(requested-imported,0));
end;
$$;

create function public.ensure_classification_reference(p_household_id uuid,p_definitions jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d jsonb; sub text; v_category_id uuid;
begin
 if jsonb_typeof(p_definitions) is distinct from 'array' or jsonb_array_length(p_definitions)>100 then raise exception 'Invalid reference' using errcode='22023';end if;
 if not exists(select 1 from public.household_members where household_id=p_household_id and user_id=auth.uid()) then raise exception 'Membership required' using errcode='42501';end if;
 for d in select value from jsonb_array_elements(p_definitions) loop
  insert into public.categories(household_id,kind,name) values(p_household_id,d->>'kind',d->>'name') on conflict(household_id,kind,name) do nothing;
  select id into v_category_id from public.categories where household_id=p_household_id and kind=d->>'kind' and name=d->>'name';
  if jsonb_array_length(d->'subcategories')>100 then raise exception 'Too many subcategories' using errcode='22023';end if;
  for sub in select jsonb_array_elements_text(d->'subcategories') loop
   insert into public.subcategories(household_id,category_id,kind,name) values(p_household_id,v_category_id,d->>'kind',sub) on conflict(category_id,name) do nothing;
  end loop;
 end loop;
 return jsonb_build_object('categories',(select jsonb_agg(c) from(select id,name,kind,active from public.categories where household_id=p_household_id)c),'subcategories',(select jsonb_agg(s) from(select id,name,category_id,active from public.subcategories where household_id=p_household_id)s));
end;
$$;
revoke all on function public.ensure_classification_reference(uuid,jsonb) from public,anon;
grant execute on function public.ensure_classification_reference(uuid,jsonb) to authenticated;

-- Review-driven repair of legacy duplicates. The chosen entry keeps its classification.
create function public.resolve_bank_duplicates(p_household_id uuid,p_keep_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$
declare kept public.bank_transactions%rowtype; duplicate record; keep_entry uuid; remove_entry uuid; n integer:=0; keep_id uuid; refs jsonb;
begin
 if auth.uid() is null or coalesce(cardinality(p_keep_ids),0) not between 1 and 250 then raise exception 'Choose up to 250 groups' using errcode='22023';end if;
 if not exists(select 1 from public.household_members where household_id=p_household_id and user_id=auth.uid()) then raise exception 'Membership required' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 foreach keep_id in array p_keep_ids loop
  select t.* into kept from public.bank_transactions t join public.bank_accounts a on a.id=t.bank_account_id where t.id=keep_id and t.household_id=p_household_id and a.owner_user_id=auth.uid() for update of t;
  if kept.id is null then raise exception 'Operation inaccessible' using errcode='42501';end if;
  select id into keep_entry from public.entries where bank_transaction_id=kept.id;
  select coalesce(jsonb_agg(distinct external_id) filter(where external_id is not null),'[]'::jsonb) into refs from public.bank_transactions where bank_account_id=kept.bank_account_id and canonical_key=kept.canonical_key and occurrence_index=kept.occurrence_index;
  for duplicate in select t.id from public.bank_transactions t where t.bank_account_id=kept.bank_account_id and t.canonical_key=kept.canonical_key and t.occurrence_index=kept.occurrence_index and t.id<>kept.id for update loop
   select id into remove_entry from public.entries where bank_transaction_id=duplicate.id;
   if remove_entry is not null and keep_entry is null then
    update public.entries set bank_transaction_id=kept.id where id=remove_entry;keep_entry:=remove_entry;
   elsif remove_entry is not null then
    if exists(select 1 from public.household_obligation_settlements where entry_id=remove_entry) then
     if exists(select 1 from public.household_obligation_settlements where entry_id=keep_entry) or not exists(select 1 from public.entries where id=keep_entry and kind='expense' and flow_type='standard' and entry_date<=(current_timestamp at time zone 'Europe/Paris')::date) then raise exception 'Unlink conflicting bill settlements first' using errcode='23514';end if;
     update public.household_obligation_settlements set entry_id=keep_entry where entry_id=remove_entry;
    end if;
    delete from public.entries where id=remove_entry;
   end if;
   delete from public.bank_transactions where id=duplicate.id;n:=n+1;
   if n>1000 then raise exception 'Repair in smaller batches' using errcode='22023';end if;
  end loop;
  update public.bank_transactions set source_metadata=source_metadata||jsonb_build_object('deduplicated_references',coalesce(source_metadata->'deduplicated_references','[]'::jsonb)||refs) where id=kept.id;
 end loop;
 return n;
end;
$$;
revoke all on function public.resolve_bank_duplicates(uuid,uuid[]) from public,anon;
grant execute on function public.resolve_bank_duplicates(uuid,uuid[]) to authenticated;

create function public.bank_duplicate_count(p_household_id uuid)
returns integer language sql stable security invoker set search_path='' as $$
 select coalesce(sum(copies-1),0)::integer from (select count(*) copies from public.bank_transactions where household_id=p_household_id group by bank_account_id,canonical_key,occurrence_index having count(*)>1) groups;
$$;
revoke all on function public.bank_duplicate_count(uuid) from public,anon;
grant execute on function public.bank_duplicate_count(uuid) to authenticated;
