-- The UI supports several owned households. Ownership is indexed, not unique.
alter table public.households drop constraint households_owner_id_key;
create index households_owner_id_idx on public.households(owner_id);

-- A membership in two households must not permit moving shared records between them.
create function public.prevent_household_reassignment()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if new.household_id is distinct from old.household_id then
  raise exception 'A shared record cannot be moved to another household' using errcode='42501';
 end if;
 return new;
end;
$$;
revoke all on function public.prevent_household_reassignment() from public,anon,authenticated;
do $$
declare t text;
begin
 foreach t in array array['categories','subcategories','entries','monthly_budgets','monthly_category_budgets','savings_movements','household_savings_goals','household_obligations','household_people','bank_accounts','bank_transactions','household_merchant_rules'] loop
  execute format('create trigger prevent_household_reassignment before update of household_id on public.%I for each row execute function public.prevent_household_reassignment()',t);
 end loop;
end;
$$;

-- Entries have no currency column and are displayed in EUR. Never silently
-- treat foreign cents as euro cents; conversion requires a separate model.
create function public.check_bank_transaction_currency()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if new.currency <> 'EUR' or not exists (
  select 1 from public.bank_accounts a
  where a.id=new.bank_account_id and a.household_id=new.household_id and a.currency=new.currency
 ) then
  raise exception 'Only EUR transactions on a matching EUR account can enter the household budget' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function public.check_bank_transaction_currency() from public,anon,authenticated;
create trigger check_bank_transaction_currency before insert or update of currency,bank_account_id,household_id
 on public.bank_transactions for each row execute function public.check_bank_transaction_currency();

-- Also guard legacy pending transactions when an entry is created via the API.
create function public.check_entry_bank_currency()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if new.bank_transaction_id is not null and not exists (
  select 1 from public.bank_transactions t
  where t.id=new.bank_transaction_id and t.household_id=new.household_id and t.currency='EUR'
 ) then
  raise exception 'The linked bank transaction must be in EUR and in this household' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function public.check_entry_bank_currency() from public,anon,authenticated;
create trigger check_entry_bank_currency before insert or update of bank_transaction_id,household_id
 on public.entries for each row execute function public.check_entry_bank_currency();

-- A balance is a snapshot, with a date and a safe integer amount.
-- NOT VALID preserves legacy data while enforcing the rule for new writes.
alter table public.bank_accounts add constraint bank_accounts_balance_snapshot_check
 check ((balance_cents is null and balance_as_of is null) or
 (balance_cents is not null and balance_as_of is not null and balance_cents between -9007199254740991 and 9007199254740991)) not valid;

-- Household setup is one transaction, so a failed category/person write cannot
-- leave a partially configured household. RLS remains active throughout.
create function public.configure_household(p_household_id uuid,p_name text,p_income_types jsonb,p_expense_types jsonb,p_people jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
 v_id uuid:=p_household_id;
 v_person jsonb;
 v_person_id uuid;
 v_index integer:=0;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if jsonb_typeof(p_income_types) is distinct from 'array' or jsonb_typeof(p_expense_types) is distinct from 'array' or jsonb_typeof(p_people) is distinct from 'array' then
  raise exception 'Categories and people must be arrays' using errcode='22023';
 end if;
 if jsonb_array_length(p_income_types)>100 or jsonb_array_length(p_expense_types)>100 or jsonb_array_length(p_people) not between 1 and 100 then
  raise exception 'Invalid number of categories or people' using errcode='22023';
 end if;
 if (select count(*) from jsonb_array_elements(p_people) p where coalesce((p->>'isPrimary')::boolean,false))<>1 then
  raise exception 'Choose exactly one primary person' using errcode='22023';
 end if;
 if v_id is null then
  insert into public.households(owner_id,name) values(auth.uid(),btrim(p_name)) returning id into v_id;
 else
  perform 1 from public.households where id=v_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Only the owner can configure the household' using errcode='42501'; end if;
  update public.households set name=btrim(p_name) where id=v_id;
 end if;
 update public.categories set active=false where household_id=v_id;
 insert into public.categories(household_id,kind,name,active)
 select v_id,'income',btrim(value),true from jsonb_array_elements_text(p_income_types)
 union all select v_id,'expense',btrim(value),true from jsonb_array_elements_text(p_expense_types)
 on conflict(household_id,kind,name) do update set active=true;
 update public.household_people set active=false,is_primary=false where household_id=v_id;
 for v_person in select value from jsonb_array_elements(p_people) loop
  v_person_id:=nullif(v_person->>'id','')::uuid;
  if v_person_id is null then
   insert into public.household_people(household_id,name,relationship,is_primary,active,sort_order)
   values(v_id,btrim(v_person->>'name'),v_person->>'relationship',coalesce((v_person->>'isPrimary')::boolean,false),true,v_index);
  else
   update public.household_people set name=btrim(v_person->>'name'),relationship=v_person->>'relationship',
    is_primary=coalesce((v_person->>'isPrimary')::boolean,false),active=true,sort_order=v_index
   where id=v_person_id and household_id=v_id;
   if not found then raise exception 'Person does not belong to this household' using errcode='42501'; end if;
  end if;
  v_index:=v_index+1;
 end loop;
 return v_id;
end;
$$;
revoke all on function public.configure_household(uuid,text,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.configure_household(uuid,text,jsonb,jsonb,jsonb) to authenticated;

create index household_members_user_id_idx on public.household_members(user_id);
create index household_invites_accepted_by_idx on public.household_invites(accepted_by);
create index household_invites_created_by_idx on public.household_invites(created_by);
create index monthly_category_budgets_category_id_idx on public.monthly_category_budgets(category_id);
create index savings_movements_goal_id_idx on public.savings_movements(goal_id);
create index subcategories_category_scope_idx on public.subcategories(category_id,household_id,kind);

-- Owner membership is created by the household trigger. The original owner
-- policies on child tables are redundant with the shared membership policies.
do $$
declare t text; prefix text; action text;
begin
 foreach t in array array['categories','subcategories','entries','monthly_budgets'] loop
  prefix:=case when t='monthly_budgets' then 'budgets' else t end;
  foreach action in array array['select','insert','update','delete'] loop
   execute format('drop policy %I on public.%I',prefix||'_owner_'||action,t);
  end loop;
 end loop;
end;
$$;

alter table public.households add constraint households_supported_currency_check
 check (currency='EUR') not valid;

-- Reconcile a bill with an existing expense, without creating another payment.
create table public.household_obligation_settlements (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 obligation_id uuid not null references public.household_obligations(id) on delete cascade,
 entry_id uuid not null unique references public.entries(id) on delete cascade,
 settled_month date not null check (extract(day from settled_month)=1),
 created_at timestamptz not null default now(),
 unique(obligation_id,settled_month)
);
create index household_obligation_settlements_household_idx on public.household_obligation_settlements(household_id,settled_month);
alter table public.household_obligation_settlements enable row level security;
revoke all on public.household_obligation_settlements from public,anon,authenticated;
grant select,insert,delete on public.household_obligation_settlements to authenticated;
create policy obligation_settlements_read on public.household_obligation_settlements for select to authenticated
 using (exists(select 1 from public.household_members m where m.household_id=household_obligation_settlements.household_id and m.user_id=(select auth.uid())));
create policy obligation_settlements_delete on public.household_obligation_settlements for delete to authenticated
 using (exists(select 1 from public.household_members m where m.household_id=household_obligation_settlements.household_id and m.user_id=(select auth.uid())));
create policy obligation_settlements_insert on public.household_obligation_settlements for insert to authenticated
 with check (
  exists(select 1 from public.household_members m where m.household_id=household_obligation_settlements.household_id and m.user_id=(select auth.uid()))
  and exists(select 1 from public.household_obligations o where o.id=household_obligation_settlements.obligation_id and o.household_id=household_obligation_settlements.household_id
   and (o.frequency='monthly' or o.due_month=extract(month from household_obligation_settlements.settled_month)))
  and exists(select 1 from public.entries e where e.id=household_obligation_settlements.entry_id and e.household_id=household_obligation_settlements.household_id
   and e.kind='expense' and e.flow_type='standard' and e.entry_date<=(current_timestamp at time zone 'Europe/Paris')::date)
 );
-- An explicitly reconciled expense remains a standard expense in that household.
-- Amount and payment date can still be corrected; deleting it reopens the bill.
create function public.check_settled_entry()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.kind<>'expense' or new.flow_type<>'standard' or new.entry_date>(current_timestamp at time zone 'Europe/Paris')::date)
  and exists(select 1 from public.household_obligation_settlements s where s.entry_id=new.id) then
  raise exception 'Unlink this expense from its bill before changing its nature or scheduling it' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function public.check_settled_entry() from public,anon,authenticated;
create trigger check_settled_entry before update of kind,flow_type,entry_date on public.entries
 for each row execute function public.check_settled_entry();
alter publication supabase_realtime add table public.household_obligation_settlements;

-- Apply the same monetary range as the entry forms at the API boundary.
alter table public.household_savings_goals add constraint household_savings_goals_safe_target
 check(target_cents<=100000000000) not valid;
alter table public.household_obligations add constraint household_obligations_safe_amount
 check(amount_cents<=100000000000) not valid;
