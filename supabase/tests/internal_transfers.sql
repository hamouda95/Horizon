-- Disposable fixture: the inner subtransaction is always rolled back after assertions.
do $test$
declare h uuid;checking uuid;savings uuid;expense_category uuid;income_category uuid;payload jsonb;result jsonb;v bigint;rejected boolean;
begin
 begin
  insert into auth.users(id,email) values('f5000000-0000-4000-8000-000000000001','transfers-owner@example.invalid'),('f5000000-0000-4000-8000-000000000002','transfers-other@example.invalid');
  set local role authenticated;
  perform set_config('request.jwt.claim.sub','f5000000-0000-4000-8000-000000000001',true);
  h:=public.configure_household_with_accounts(null,'Transfers fixture','["Salaire"]','["Courses"]','[{"name":"Moi","relationship":"self","isPrimary":true}]',jsonb_build_array(jsonb_build_object('name','Checking','account_type','checking','balance_cents',1000000,'balance_date',(current_date-4)::text),jsonb_build_object('name','Savings','account_type','savings','balance_cents',0,'balance_date',(current_date-4)::text)),null);
  select id into checking from public.bank_accounts where household_id=h and account_type='checking';select id into savings from public.bank_accounts where household_id=h and account_type='savings';
  select id into expense_category from public.categories where household_id=h and kind='expense';select id into income_category from public.categories where household_id=h and kind='income';
  select jsonb_agg(jsonb_build_object('fingerprint','checking:'||d,'transaction_date',current_date-d,'label','Virement vers épargne','amount_cents',amount,'currency','EUR','category_id',case when amount>0 then income_category else expense_category end,'flow_type',nature,'source_metadata',jsonb_build_object('category_hint','Mouvements internes'))) into payload from(values(3,-200000,'savings'),(2,-200000,'savings'),(1,400000,'standard')) x(d,amount,nature);
  result:=public.import_bank_transactions(checking,payload);if (result->>'imported')::integer<>3 then raise exception 'Incorrect import count before reconciliation';end if;
  select jsonb_agg(jsonb_build_object('fingerprint','savings:'||d,'transaction_date',current_date-d,'label','Virement depuis compte courant','amount_cents',amount,'currency','EUR','category_id',case when amount>0 then income_category else expense_category end,'flow_type',nature,'source_metadata',jsonb_build_object('category_hint','Mouvements internes'))) into payload from(values(3,200000,'standard'),(2,200000,'standard'),(1,-400000,'savings')) x(d,amount,nature);
  result:=public.import_bank_transactions(savings,payload);if (result->>'imported')::integer<>3 then raise exception 'Incorrect import count after reconciliation';end if;
  if (select count(*) from public.entries where household_id=h)<>6 or exists(select 1 from public.entries where household_id=h and flow_type<>'transfer') then raise exception 'Round trip was not reconciled on both accounts';end if;
  select sum(effective_balance_cents) into v from public.financial_accounts where household_id=h;if v<>1000000 then raise exception 'Round trip changed total wealth: %',v;end if;
  if (select effective_balance_cents from public.financial_accounts where id=checking)<>1000000 or (select effective_balance_cents from public.financial_accounts where id=savings)<>0 then raise exception 'Account balances do not return to their starting amounts';end if;
  if public.reconcile_internal_bank_transfers(h)<>0 then raise exception 'Reconciliation is not idempotent';end if;
  -- Equal amounts alone are never sufficient to classify unrelated operations as internal.
  perform public.import_bank_transactions(checking,jsonb_build_array(jsonb_build_object('fingerprint','external-out','transaction_date',current_date,'label','Virement achat mobilier','amount_cents',-15000,'currency','EUR','category_id',expense_category,'flow_type','standard')));
  perform public.import_bank_transactions(savings,jsonb_build_array(jsonb_build_object('fingerprint','external-in','transaction_date',current_date,'label','Virement tiers','amount_cents',15000,'currency','EUR','category_id',income_category,'flow_type','standard')));
  if (select count(*) from public.entries where household_id=h and flow_type='standard')<>2 then raise exception 'Unrelated payments were classified as internal';end if;
  perform set_config('request.jwt.claim.sub','f5000000-0000-4000-8000-000000000002',true);
  rejected:=false;begin perform public.reconcile_internal_bank_transfers(h);exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'Cross-household reconciliation allowed';end if;
  raise exception 'Fixture rollback' using errcode='ZT001';
 exception when sqlstate 'ZT001' then null;
 end;
end;
$test$;
