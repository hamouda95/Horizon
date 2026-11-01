begin;
insert into auth.users(id,email) values('f5000000-0000-4000-8000-000000000001','balance-owner@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','f5000000-0000-4000-8000-000000000001',true);
do $$
declare h uuid; a uuid; c uuid; v bigint; x jsonb; first_copy uuid; second_copy uuid; kept uuid; rejected boolean; d date:=current_date-1;
begin
 h:=public.configure_household_with_accounts(null,'Balance fixture','["Salaire"]','["Courses"]','[{"name":"Moi","relationship":"self","isPrimary":true}]',jsonb_build_array(jsonb_build_object('name','Bank','account_type','checking','balance_cents',30000,'balance_date',d::text)),null);
 select id into a from public.bank_accounts where household_id=h;select id into c from public.categories where household_id=h and kind='expense';
 perform set_config('test.balance.account',a::text,true);perform set_config('test.balance.household',h::text,true);
 -- Operations of the balance day imported the day the balance is typed are already in it.
 x:=public.import_bank_transactions(a,jsonb_build_array(jsonb_build_object('fingerprint','row:'||d||'|-2570|EUR|carte mazroom|occurrence:1','transaction_date',d,'label','CARTE MAZROOM','amount_cents',-2570,'currency','EUR','category_id',c,'flow_type','standard')));
 select effective_balance_cents into v from public.financial_accounts where id=a;if v<>30000 then raise exception 'Same-day import counted twice: %',v;end if;
 -- Shifted copies of one card payment, one day apart.
 x:=public.import_bank_transactions(a,jsonb_build_array(
  jsonb_build_object('fingerprint','row:2026-09-21|-1000|EUR|carte 19 09 urbansoccer|occurrence:1','transaction_date','2026-09-21','label','CARTE 19/09 UrbanSoccer','amount_cents',-1000,'currency','EUR','category_id',c,'flow_type','standard'),
  jsonb_build_object('fingerprint','row:2026-09-20|-1000|EUR|carte 19 09 urbansoccer|occurrence:1','transaction_date','2026-09-20','label','CARTE 19/09 UrbanSoccer','amount_cents',-1000,'currency','EUR','category_id',c,'flow_type','standard'),
  jsonb_build_object('fingerprint','row:2026-09-18|-1000|EUR|carte 19 09 urbansoccer|occurrence:1','transaction_date','2026-09-18','label','CARTE 19/09 UrbanSoccer','amount_cents',-1000,'currency','EUR','category_id',c,'flow_type','standard')));
 select id into first_copy from public.bank_transactions where bank_account_id=a and transaction_date='2026-09-21';
 select id into second_copy from public.bank_transactions where bank_account_id=a and transaction_date='2026-09-20';
 select id into kept from public.bank_transactions where bank_account_id=a and transaction_date='2026-09-18';
 rejected:=false;begin perform public.resolve_bank_shifted_duplicates(h,array[kept],array[first_copy]);exception when invalid_parameter_value then rejected:=true;end;if not rejected then raise exception 'Operations three days apart merged';end if;
 if public.resolve_bank_shifted_duplicates(h,array[first_copy],array[second_copy])<>1 then raise exception 'Shifted copy not removed';end if;
 if exists(select 1 from public.bank_transactions where id=second_copy) or (select count(*) from public.entries where household_id=h and label ilike '%urbansoccer%')<>2 then raise exception 'Shifted copy still counted';end if;
end;
$$;
-- The balance was typed two days ago: an operation of its day imported since then was not in it.
reset role;
set local session_replication_role=replica;
update public.bank_accounts set balance_recorded_at=now()-interval '2 days' where id=current_setting('test.balance.account')::uuid;
set local session_replication_role=origin;
set local role authenticated;
do $$
declare v bigint;
begin
 select effective_balance_cents into v from public.financial_accounts where id=current_setting('test.balance.account')::uuid;if v<>27430 then raise exception 'Late import of the balance day ignored: %',v;end if;
 update public.bank_accounts set balance_cents=20000 where id=current_setting('test.balance.account')::uuid;
 select effective_balance_cents into v from public.financial_accounts where id=current_setting('test.balance.account')::uuid;if v<>20000 then raise exception 'New balance not stamped: %',v;end if;
end;
$$;
rollback;
