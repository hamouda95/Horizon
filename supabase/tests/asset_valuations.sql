do $test$
declare h uuid;a uuid;v jsonb;rejected boolean;
begin
 begin
  insert into auth.users(id,email) values('f7000000-0000-4000-8000-000000000001','valuation-owner@example.invalid'),('f7000000-0000-4000-8000-000000000002','valuation-other@example.invalid');
  set local role authenticated;
  perform set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000001',true);
  h:=public.configure_household_with_accounts(null,'Valuation fixture','["Salaire"]','["Courses"]','[{"name":"Moi","relationship":"self","isPrimary":true}]',jsonb_build_array(jsonb_build_object('name','Investment','account_type','savings','balance_cents',100000,'balance_date',(current_date-1)::text)),null);
  select id into a from public.bank_accounts where household_id=h;
  v:=jsonb_build_object('kind','investment','currency','EUR','asOf',(current_date-1)::text,'grossCents',100000,'estimatedNetCents',99000,'lockedCents',100000,'gainLossCents',5000,'plan','Example','source','Example','releaseNotes','[]'::jsonb);
  update public.bank_accounts set account_type='investment',valuation_details=v where id=a;
  if (select count(*) from public.bank_accounts where household_id=h)<>1 or (select account_type from public.bank_accounts where id=a)<>'investment' then raise exception 'Classification repair duplicated or failed';end if;
  if (select effective_balance_cents from public.financial_accounts where id=a)<>100000 then raise exception 'Valuation double counted';end if;
  if exists(select 1 from public.entries where household_id=h) then raise exception 'Valuation created income';end if;
  rejected:=false;begin update public.bank_accounts set valuation_details=jsonb_set(v,'{lockedCents}','100001') where id=a;exception when check_violation then rejected:=true;end;
  if not rejected then raise exception 'Impossible locked amount accepted';end if;
  update public.bank_accounts set balance_as_of=((current_date-1)::text||'T12:00:00Z')::timestamptz where id=a;
  if not exists(select 1 from public.financial_accounts where id=a and valuation_details is not null) then raise exception 'Same-day valuation lost';end if;
  update public.bank_accounts set balance_cents=110000 where id=a;
  if exists(select 1 from public.financial_accounts where id=a and valuation_details is not null) then raise exception 'Outdated valuation retained';end if;
  perform set_config('request.jwt.claim.sub','f7000000-0000-4000-8000-000000000002',true);
  if exists(select 1 from public.financial_accounts where id=a) then raise exception 'Cross-household view leakage';end if;
  update public.bank_accounts set valuation_details=v where id=a;if found then raise exception 'Cross-household mutation';end if;
  raise exception using errcode='ZX001',message='fixture verified';
 exception when sqlstate 'ZX001' then null;
 end;
end;
$test$;
