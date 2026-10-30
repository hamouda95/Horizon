alter table public.bank_accounts drop constraint bank_accounts_account_type_check;
alter table public.bank_accounts add constraint bank_accounts_account_type_check
 check(account_type in('checking','cash','savings','investment','crypto','credit','other'));
alter table public.entries drop constraint entries_flow_type_check;
alter table public.entries add constraint entries_flow_type_check
 check(flow_type in('standard','transfer','refund','savings','investment','review'));
alter table public.household_merchant_rules drop constraint household_merchant_rules_flow_type_check;
alter table public.household_merchant_rules add constraint household_merchant_rules_flow_type_check
 check(flow_type is null or flow_type in('standard','transfer','refund','savings','investment','review'));

-- Opening assets are snapshots, never income entries. All setup writes are atomic.
create function public.configure_household_with_accounts(p_household_id uuid,p_name text,p_income_types jsonb,p_expense_types jsonb,p_people jsonb,p_accounts jsonb,p_budget jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
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
   values(home_id,auth.uid(),person_id,'import',gen_random_uuid()::text,btrim(account->>'name'),nullif(btrim(account->>'source_name'),''),account->>'account_type','EUR',amount,
    case when amount is not null then ((account->>'balance_date')::date::timestamp+interval '12 hours') at time zone 'UTC' else null end);
 end loop;
 if p_budget is not null then insert into public.monthly_budgets(household_id,month,income_cents,expense_cents) values(home_id,(p_budget->>'month')::date,(p_budget->>'income_cents')::bigint,(p_budget->>'expense_cents')::bigint);end if;
 return home_id;
end;
$$;
revoke all on function public.configure_household_with_accounts(uuid,text,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.configure_household_with_accounts(uuid,text,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;

create function public.delete_manual_accounts(p_household_id uuid,p_account_ids uuid[])
returns jsonb language plpgsql security invoker set search_path='' as $$
declare requested integer; actual integer; entries_deleted integer;
begin
 select count(distinct id) into requested from unnest(p_account_ids) id;
 if requested not between 1 and 100 then raise exception 'Choose 1 to 100 accounts' using errcode='22023';end if;
 perform 1 from public.bank_accounts where id=any(p_account_ids) order by id for update;
 select count(*) into actual from public.bank_accounts a where a.id=any(p_account_ids) and a.household_id=p_household_id and a.owner_user_id=auth.uid() and a.provider='import';
 if actual<>requested then raise exception 'Some accounts are missing or not yours' using errcode='42501';end if;
 delete from public.entries where household_id=p_household_id and bank_transaction_id in(select id from public.bank_transactions where bank_account_id=any(p_account_ids));
 get diagnostics entries_deleted=row_count;
 delete from public.bank_accounts where id=any(p_account_ids) and household_id=p_household_id;
 get diagnostics actual=row_count;
 if actual<>requested then raise exception 'Account deletion failed' using errcode='42501';end if;
 return jsonb_build_object('accounts_deleted',actual,'entries_deleted',entries_deleted);
end;
$$;
revoke all on function public.delete_manual_accounts(uuid,uuid[]) from public,anon;
grant execute on function public.delete_manual_accounts(uuid,uuid[]) to authenticated;

create function public.bulk_manage_entries(p_household_id uuid,p_entry_ids uuid[],p_action text,p_value text default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare requested integer; actual integer; bank_ids uuid[];
begin
 select count(distinct id) into requested from unnest(p_entry_ids) id;
 if requested not between 1 and 500 then raise exception 'Choose 1 to 500 operations' using errcode='22023';end if;
 perform 1 from public.entries where id=any(p_entry_ids) order by id for update;
 select count(*),array_agg(bank_transaction_id) filter(where bank_transaction_id is not null) into actual,bank_ids
 from public.entries where id=any(p_entry_ids) and household_id=p_household_id;
 if actual<>requested then raise exception 'Some operations are missing or inaccessible' using errcode='42501';end if;
 if p_action='delete' then
  if exists(select 1 from public.bank_transactions t join public.bank_accounts a on a.id=t.bank_account_id
    where t.id=any(bank_ids) and a.owner_user_id<>auth.uid() and not exists(select 1 from public.households h where h.id=p_household_id and h.owner_id=auth.uid())) then
   raise exception 'You cannot delete another member’s imported operations' using errcode='42501';
  end if;
  delete from public.entries where id=any(p_entry_ids) and household_id=p_household_id;
  delete from public.bank_transactions where id=any(bank_ids) and household_id=p_household_id;
 elsif p_action='category' then
  if not exists(select 1 from public.categories c where c.id=p_value::uuid and c.household_id=p_household_id and c.active
    and not exists(select 1 from public.entries e where e.id=any(p_entry_ids) and e.kind<>c.kind)) then
   raise exception 'Choose a category matching all selected operations' using errcode='23514';end if;
  update public.entries set category_id=p_value::uuid,subcategory_id=null where id=any(p_entry_ids) and household_id=p_household_id;
 elsif p_action='person' then
  update public.entries set person_id=nullif(p_value,'')::uuid where id=any(p_entry_ids) and household_id=p_household_id;
 elsif p_action='flow' then
  if p_value is null or p_value not in('standard','transfer','refund','savings','investment','review') then raise exception 'Invalid flow type' using errcode='22023';end if;
  update public.entries set flow_type=p_value,expense_type=case when p_value='standard' then expense_type else null end,
   income_allocation=case when p_value='standard' then income_allocation else 'calendar' end where id=any(p_entry_ids) and household_id=p_household_id;
 else raise exception 'Unknown bulk action' using errcode='22023';
 end if;
 return requested;
end;
$$;
revoke all on function public.bulk_manage_entries(uuid,uuid[],text,text) from public,anon;
grant execute on function public.bulk_manage_entries(uuid,uuid[],text,text) to authenticated;
