-- One ledger: entries carry cash-account and receivable links; snapshots are closing balances.
alter table public.entries drop constraint entries_flow_type_check;
alter table public.entries add constraint entries_flow_type_check check(flow_type in('standard','transfer','refund','savings','investment','review','loan'));
alter table public.entries add column account_id uuid;
alter table public.entries add constraint entries_account_scope foreign key(account_id,household_id) references public.bank_accounts(id,household_id) on delete set null(account_id);
alter table public.entries add column payment_method text check(payment_method is null or payment_method in('cash','transfer','card','cheque','other'));
create index entries_account_scope_idx on public.entries(account_id,household_id);
create table public.household_loans(
 id uuid primary key default gen_random_uuid(),household_id uuid not null references public.households(id) on delete cascade,
 borrower text not null check(char_length(btrim(borrower)) between 1 and 100),
 opening_principal_cents bigint not null default 0 check(opening_principal_cents between 0 and 100000000000),
 opened_on date,notes text not null default '' check(char_length(notes)<=1000),created_at timestamptz not null default now(),
 unique(id,household_id)
);
alter table public.household_loans enable row level security;
create policy loan_members on public.household_loans for all to authenticated using(exists(select 1 from public.household_members m where m.household_id=household_loans.household_id and m.user_id=(select auth.uid()))) with check(exists(select 1 from public.household_members m where m.household_id=household_loans.household_id and m.user_id=(select auth.uid())));
grant select,insert,update,delete on public.household_loans to authenticated;
create index household_loans_household_idx on public.household_loans(household_id);
alter table public.entries add column loan_id uuid;
alter table public.entries add constraint entries_loan_scope foreign key(loan_id,household_id) references public.household_loans(id,household_id) on delete no action deferrable initially deferred;
alter table public.entries add constraint entries_loan_nature check((flow_type='loan')=(loan_id is not null));
create index entries_loan_scope_idx on public.entries(loan_id,household_id);

create function public.validate_entry_finance_links() returns trigger language plpgsql security invoker set search_path='' as $$
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
 if new.account_id is not null and not exists(select 1 from public.bank_accounts where id=new.account_id and household_id=new.household_id and currency='EUR') then raise exception 'Manual entries require a euro account in this household' using errcode='23514';end if;
 return new;
end;
$$;
create trigger validate_entry_finance_links before insert or update or delete on public.entries for each row execute function public.validate_entry_finance_links();
create function public.check_loan_balance() returns trigger language plpgsql security invoker set search_path='' as $$
declare target uuid;
begin
 for target in select distinct id from unnest(array[case when tg_op<>'INSERT' then old.loan_id end,case when tg_op<>'DELETE' then new.loan_id end]) id where id is not null loop
  if exists(select 1 from (select l.opening_principal_cents+sum(sum(case when e.kind='expense' then e.amount_cents else -e.amount_cents end)) over(order by e.entry_date) running
   from public.household_loans l join public.entries e on e.loan_id=l.id where l.id=target group by l.opening_principal_cents,e.entry_date) s where running<0) then raise exception 'Repayments cannot exceed the amount lent at that date' using errcode='23514';end if;
 end loop;return null;
end;
$$;
create constraint trigger check_loan_balance after insert or update or delete on public.entries deferrable initially deferred for each row execute function public.check_loan_balance();
create function public.protect_loan_opening() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.household_id,new.opening_principal_cents,new.opened_on) is distinct from (old.household_id,old.opening_principal_cents,old.opened_on) then raise exception 'Opening receivable history is immutable; correct linked operations instead' using errcode='23514';end if;return new;
end;
$$;
create trigger protect_loan_opening before update on public.household_loans for each row execute function public.protect_loan_opening();

create function public.create_household_loan(p_household_id uuid,p_borrower text,p_opening_cents bigint,p_opened_on date,p_notes text,p_existing_entry_id uuid default null,p_account_id uuid default null,p_payment_method text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; category uuid; changed integer;
begin
 insert into public.household_loans(household_id,borrower,opening_principal_cents,opened_on,notes) values(p_household_id,btrim(p_borrower),p_opening_cents,p_opened_on,coalesce(p_notes,'')) returning id into result;
 insert into public.categories(household_id,kind,name) values(p_household_id,'expense','Prêt à un ami'),(p_household_id,'income','Remboursement de prêt') on conflict(household_id,kind,name) do nothing;
 if p_existing_entry_id is not null then
  select id into category from public.categories where household_id=p_household_id and kind='income' and name='Remboursement de prêt';
  update public.entries set loan_id=result,flow_type='loan',category_id=category,subcategory_id=null,account_id=p_account_id,payment_method=p_payment_method
   where id=p_existing_entry_id and household_id=p_household_id and kind='income' and loan_id is null;
  get diagnostics changed=row_count;if changed<>1 then raise exception 'Repayment missing or already linked' using errcode='23514';end if;
 end if;return result;
end;
$$;
revoke all on function public.create_household_loan(uuid,text,bigint,date,text,uuid,uuid,text) from public,anon;
grant execute on function public.create_household_loan(uuid,text,bigint,date,text,uuid,uuid,text) to authenticated;

create view public.financial_accounts with(security_invoker=true) as
 select a.*,case when a.balance_cents is null then null else a.balance_cents+coalesce((select sum(case when e.kind='income' then e.amount_cents else -e.amount_cents end)
 from public.entries e left join public.bank_transactions t on t.id=e.bank_transaction_id
 where e.household_id=a.household_id and coalesce(t.bank_account_id,e.account_id)=a.id
 and e.entry_date>(a.balance_as_of at time zone 'Europe/Paris')::date and e.entry_date<=(current_timestamp at time zone 'Europe/Paris')::date),0) end::bigint as effective_balance_cents
 from public.bank_accounts a;
grant select on public.financial_accounts to authenticated;

-- Append-only versions. Monthly overrides remain explicit and keep precedence.
create table public.category_budget_rules(
 id uuid primary key default gen_random_uuid(),revision bigint generated always as identity unique,
 household_id uuid not null references public.households(id) on delete cascade,category_id uuid not null,
 kind text not null default 'expense' check(kind='expense'),effective_month date not null check(extract(day from effective_month)=1),
 cadence text not null check(cadence in('monthly','annual')),amount_cents bigint not null check(amount_cents between 0 and 100000000000),
 enabled boolean not null default true,created_at timestamptz not null default now(),
 foreign key(category_id,household_id,kind) references public.categories(id,household_id,kind) on delete restrict
);
alter table public.category_budget_rules enable row level security;
create policy budget_rule_read on public.category_budget_rules for select to authenticated using(exists(select 1 from public.household_members m where m.household_id=category_budget_rules.household_id and m.user_id=(select auth.uid())));
create policy budget_rule_insert on public.category_budget_rules for insert to authenticated with check(effective_month>=date_trunc('month',current_timestamp at time zone 'Europe/Paris')::date and exists(select 1 from public.household_members m where m.household_id=category_budget_rules.household_id and m.user_id=(select auth.uid())));
grant select,insert on public.category_budget_rules to authenticated;
grant usage,select on sequence public.category_budget_rules_revision_seq to authenticated;
create index category_budget_rules_scope_idx on public.category_budget_rules(household_id,category_id,effective_month,revision);
create trigger prevent_budget_rule_reassignment before update of household_id on public.category_budget_rules for each row execute function public.prevent_household_reassignment();
create function public.configure_category_budgets(p_household_id uuid,p_effective_month date,p_rules jsonb,p_replace_override boolean default false)
returns integer language plpgsql security invoker set search_path='' as $$
declare r jsonb;n integer:=0;
begin
 if jsonb_typeof(p_rules) is distinct from 'array' or jsonb_array_length(p_rules) not between 1 and 100 or p_effective_month<date_trunc('month',current_timestamp at time zone 'Europe/Paris')::date then raise exception 'Choose current/future month and up to 100 rules' using errcode='22023';end if;
 for r in select value from jsonb_array_elements(p_rules) loop
  insert into public.category_budget_rules(household_id,category_id,effective_month,cadence,amount_cents,enabled) values(p_household_id,(r->>'category_id')::uuid,p_effective_month,r->>'cadence',(r->>'amount_cents')::bigint,coalesce((r->>'enabled')::boolean,true));
  if p_replace_override then delete from public.monthly_category_budgets where household_id=p_household_id and category_id=(r->>'category_id')::uuid and month=p_effective_month;end if;n:=n+1;
 end loop;return n;
end;
$$;
revoke all on function public.configure_category_budgets(uuid,date,jsonb,boolean) from public,anon;
grant execute on function public.configure_category_budgets(uuid,date,jsonb,boolean) to authenticated;

-- Readable change history, append-only for clients. Audit writing needs narrowly scoped elevation.
create table public.financial_entry_history(id uuid primary key default gen_random_uuid(),household_id uuid not null references public.households(id) on delete cascade,entry_id uuid not null,operation text not null,changed_at timestamptz not null default now(),actor_id uuid,old_data jsonb,new_data jsonb);
alter table public.financial_entry_history enable row level security;
create policy entry_history_read on public.financial_entry_history for select to authenticated using(exists(select 1 from public.household_members m where m.household_id=financial_entry_history.household_id and m.user_id=(select auth.uid())));
grant select on public.financial_entry_history to authenticated;
create index financial_history_scope_idx on public.financial_entry_history(household_id,entry_id,changed_at);
create function public.audit_financial_entry() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.households where id=case when tg_op='DELETE' then old.household_id else new.household_id end) then
 insert into public.financial_entry_history(household_id,entry_id,operation,actor_id,old_data,new_data) values(case when tg_op='DELETE' then old.household_id else new.household_id end,case when tg_op='DELETE' then old.id else new.id end,tg_op,auth.uid(),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end);end if;return null;
end;
$$;
revoke all on function public.audit_financial_entry() from public,anon,authenticated;
create trigger audit_financial_entry after insert or update or delete on public.entries for each row execute function public.audit_financial_entry();
alter publication supabase_realtime add table public.household_loans,public.category_budget_rules;
