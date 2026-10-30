-- Execute in a transaction after the migration; all fixtures are synthetic.
begin;
insert into auth.users(id,email) values
 ('f0000000-0000-4000-8000-000000000001','horizon-audit-owner@example.invalid'),
 ('f0000000-0000-4000-8000-000000000002','horizon-audit-member@example.invalid'),
 ('f0000000-0000-4000-8000-000000000003','horizon-audit-outsider@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
do $$
declare
 h uuid; h2 uuid; cat uuid; account uuid; entry_id uuid; movement uuid; bill uuid; bill2 uuid; foreign_entry uuid; result jsonb; token text; rejected boolean; n integer;
 people jsonb:='[{"name":"Moi","relationship":"self","isPrimary":true}]';
begin
 h:=public.configure_household(null,'Audit fixture','["Salaire"]','["Courses"]',people);
 h2:=public.configure_household(null,'Second fixture','["Salaire"]','["Courses"]',people);
 if h=h2 then raise exception 'Distinct households expected'; end if;
 select id into cat from public.categories where household_id=h and kind='expense';
 select invite_token into token from public.create_household_invite(h,null);
 perform set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000002',true);
 perform public.accept_household_invite(token);
 insert into public.entries(household_id,category_id,kind,label,amount_cents,entry_date)
 values(h,cat,'expense','Shared entry',100,current_date) returning id into entry_id;
 rejected:=false;
 begin perform public.configure_household(h,'Forbidden','[]','[]',people);
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Member configured owner settings'; end if;
 perform set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000003',true);
 if exists(select 1 from public.entries where id=entry_id) then raise exception 'Outsider read private entries'; end if;
 perform set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
 insert into public.savings_movements(household_id,movement_type,amount_cents,movement_date)
 values(h,'deposit',100,current_date) returning id into movement;
 rejected:=false;
 begin update public.savings_movements set household_id=h2 where id=movement;
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Moved a shared record between owned households'; end if;
 rejected:=false;
 begin perform public.configure_household(h,'Should roll back','["Duplicate","Duplicate"]','["Courses"]',people);
 exception when cardinality_violation then rejected:=true; end;
 if not rejected or not exists(select 1 from public.households where id=h and name='Audit fixture') then raise exception 'Setup was not atomic'; end if;
 insert into public.bank_accounts(household_id,owner_user_id,provider,external_account_id,name,account_type,currency)
 values(h,auth.uid(),'import','audit-fixture','Audit account','checking','EUR') returning id into account;
 result:=public.import_bank_transactions(account,jsonb_build_array(jsonb_build_object('fingerprint','audit:eur','transaction_date',current_date,'label','Imported expense','amount_cents',-1234,'currency','EUR','category_id',cat)));
 if result->>'imported'<>'1' then raise exception 'EUR import failed'; end if;
 result:=public.import_bank_transactions(account,jsonb_build_array(jsonb_build_object('fingerprint','audit:eur','transaction_date',current_date,'label','Imported expense','amount_cents',-1234,'currency','EUR','category_id',cat)));
 if result->>'imported'<>'0' or result->>'duplicates'<>'1' then raise exception 'Import not idempotent'; end if;
 rejected:=false;
 begin perform public.import_bank_transactions(account,jsonb_build_array(jsonb_build_object('fingerprint','audit:usd','transaction_date',current_date,'label','Foreign expense','amount_cents',-1234,'currency','USD','category_id',cat)));
 exception when check_violation then rejected:=true; end;
 if not rejected then raise exception 'Imported USD as EUR'; end if;
 rejected:=false;
 begin update public.bank_accounts set balance_cents=100 where id=account;
 exception when check_violation then rejected:=true; end;
 if not rejected then raise exception 'Balance accepted without snapshot date'; end if;
 update public.bank_accounts set balance_cents=100,balance_as_of=now() where id=account;
 insert into public.household_obligations(household_id,category_id,title,amount_cents,frequency,due_day)
 values(h,cat,'Monthly fixture',100,'monthly',15) returning id into bill;
 insert into public.household_obligation_settlements(household_id,obligation_id,entry_id,settled_month)
 values(h,bill,entry_id,date_trunc('month',current_date)::date);
 if (select count(*) from public.entries where id=entry_id)<>1 then raise exception 'Settlement duplicated its expense'; end if;
 rejected:=false;
 begin update public.entries set flow_type='transfer' where id=entry_id;
 exception when check_violation then rejected:=true; end;
 if not rejected then raise exception 'Settled expense became a transfer'; end if;
 insert into public.household_obligations(household_id,title,amount_cents,frequency,due_day)
 values(h,'Second monthly fixture',100,'monthly',15) returning id into bill2;
 rejected:=false;
 begin insert into public.household_obligation_settlements(household_id,obligation_id,entry_id,settled_month)
 values(h,bill2,entry_id,date_trunc('month',current_date)::date);
 exception when unique_violation then rejected:=true; end;
 if not rejected then raise exception 'Same expense settled two bills'; end if;
 insert into public.entries(household_id,category_id,kind,label,amount_cents,entry_date)
 select h2,id,'expense','Other household payment',100,current_date from public.categories where household_id=h2 and kind='expense' returning id into foreign_entry;
 rejected:=false;
 begin insert into public.household_obligation_settlements(household_id,obligation_id,entry_id,settled_month)
 values(h,bill2,foreign_entry,date_trunc('month',current_date)::date);
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Cross-household payment was linked'; end if;
 delete from public.entries where id=entry_id;
 if exists(select 1 from public.household_obligation_settlements where obligation_id=bill) then raise exception 'Deleting the expense did not reopen the bill'; end if;
 perform public.remove_household_member(h,'f0000000-0000-4000-8000-000000000002');
 perform set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000002',true);
 select count(*) into n from public.entries where household_id=h;
 if n<>0 then raise exception 'Removed member still sees entries'; end if;
end;
$$;
rollback;
