create table public.bank_accounts (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check(provider in ('import','bridge')),
 external_account_id text not null check(char_length(btrim(external_account_id)) between 1 and 180),
 provider_item_id text,
 name text not null check(char_length(btrim(name)) between 1 and 100),
 account_type text not null check(account_type in ('checking','savings','cash','other')),
 currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'),
 balance_cents bigint,
 balance_as_of timestamptz,
 status text not null default 'import' check(status in ('import','connected','error','disconnected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint bank_accounts_external_unique unique(household_id,provider,external_account_id),
 constraint bank_accounts_id_household_unique unique(id,household_id)
);
create index bank_accounts_household_idx on public.bank_accounts(household_id,created_at desc);
alter table public.bank_accounts enable row level security;
grant select,insert,update,delete on public.bank_accounts to authenticated;
create policy bank_accounts_select_members on public.bank_accounts for select to authenticated
 using(exists(select 1 from public.household_members m where m.household_id=bank_accounts.household_id and m.user_id=(select auth.uid())));
create policy bank_accounts_insert_members on public.bank_accounts for insert to authenticated
 with check(owner_user_id=(select auth.uid()) and exists(select 1 from public.household_members m where m.household_id=bank_accounts.household_id and m.user_id=(select auth.uid())));
create policy bank_accounts_update_owner on public.bank_accounts for update to authenticated
 using(owner_user_id=(select auth.uid()) or exists(select 1 from public.households h where h.id=bank_accounts.household_id and h.owner_id=(select auth.uid())))
 with check(exists(select 1 from public.household_members m where m.household_id=bank_accounts.household_id and m.user_id=(select auth.uid())));
create policy bank_accounts_delete_owner on public.bank_accounts for delete to authenticated
 using(owner_user_id=(select auth.uid()) or exists(select 1 from public.households h where h.id=bank_accounts.household_id and h.owner_id=(select auth.uid())));

create table public.bank_provider_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 provider text not null check(provider='bridge'),
 provider_user_id text not null unique,
 created_at timestamptz not null default now()
);
alter table public.bank_provider_users enable row level security;
revoke all on public.bank_provider_users from public,anon,authenticated;
grant all on public.bank_provider_users to service_role;

create table public.bank_transactions (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 bank_account_id uuid not null,
 external_id text,
 fingerprint text not null check(char_length(btrim(fingerprint)) between 1 and 600),
 transaction_date date not null,
 value_date date,
 label text not null check(char_length(btrim(label)) between 1 and 240),
 amount_cents bigint not null check(amount_cents<>0),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 created_at timestamptz not null default now(),
 constraint bank_transactions_account_scope foreign key(bank_account_id,household_id) references public.bank_accounts(id,household_id) on delete cascade,
 constraint bank_transactions_fingerprint_unique unique(bank_account_id,fingerprint),
 constraint bank_transactions_id_household_unique unique(id,household_id)
);
create unique index bank_transactions_external_id_unique on public.bank_transactions(bank_account_id,external_id) where external_id is not null;
create index bank_transactions_household_date_idx on public.bank_transactions(household_id,transaction_date desc);
alter table public.bank_transactions enable row level security;
grant select,insert on public.bank_transactions to authenticated;
create policy bank_transactions_select_members on public.bank_transactions for select to authenticated
 using(exists(select 1 from public.household_members m where m.household_id=bank_transactions.household_id and m.user_id=(select auth.uid())));
create policy bank_transactions_insert_account_owner on public.bank_transactions for insert to authenticated
 with check(exists(select 1 from public.bank_accounts a where a.id=bank_transactions.bank_account_id and a.household_id=bank_transactions.household_id and (a.owner_user_id=(select auth.uid()) or exists(select 1 from public.households h where h.id=a.household_id and h.owner_id=(select auth.uid())))));

alter table public.entries add column bank_transaction_id uuid;
alter table public.entries add constraint entries_bank_transaction_scope foreign key(bank_transaction_id,household_id) references public.bank_transactions(id,household_id) on delete set null (bank_transaction_id);
create unique index entries_bank_transaction_unique on public.entries(bank_transaction_id) where bank_transaction_id is not null;
grant select,insert on public.entries to authenticated;

create function public.import_bank_transactions(p_bank_account_id uuid,p_transactions jsonb)
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
  select p_bank_account_id as bank_account_id,v_household_id as household_id,t.external_id,t.fingerprint,t.transaction_date,t.value_date,btrim(t.label) as label,t.amount_cents,upper(t.currency) as currency,t.category_id
  from jsonb_to_recordset(p_transactions) as t(external_id text,fingerprint text,transaction_date date,value_date date,label text,amount_cents bigint,currency text,category_id uuid)
 ), inserted as (
  insert into public.bank_transactions(household_id,bank_account_id,external_id,fingerprint,transaction_date,value_date,label,amount_cents,currency)
  select household_id,bank_account_id,external_id,fingerprint,transaction_date,value_date,label,amount_cents,currency from parsed
  on conflict do nothing
  returning id,household_id,transaction_date,label,amount_cents
 ), entries_added as (
  insert into public.entries(household_id,bank_transaction_id,category_id,kind,label,amount_cents,entry_date,frequency,income_allocation,expense_type)
  select i.household_id,i.id,p.category_id,case when i.amount_cents>0 then 'income' else 'expense' end,i.label,abs(i.amount_cents),i.transaction_date,'monthly','calendar',null
  from inserted i join parsed p on p.fingerprint=(select bt.fingerprint from public.bank_transactions bt where bt.id=i.id)
  returning bank_transaction_id
 ) select count(*) into v_imported from entries_added;
 return jsonb_build_object('imported',v_imported,'duplicates',greatest(v_requested-v_imported,0));
end;
$$;
revoke all on function public.import_bank_transactions(uuid,jsonb) from public,anon;
grant execute on function public.import_bank_transactions(uuid,jsonb) to authenticated;

alter publication supabase_realtime add table public.bank_accounts;
alter publication supabase_realtime add table public.bank_transactions;
