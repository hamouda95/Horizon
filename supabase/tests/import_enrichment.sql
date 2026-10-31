-- All fixtures are rolled back, including on assertion failures.
do $test$
declare h uuid;a uuid;c uuid;payload jsonb;r jsonb;tx uuid;before_metadata jsonb;
begin
 begin
  insert into auth.users(id,email) values('f6000000-0000-4000-8000-000000000001','enrichment-owner@example.invalid'),('f6000000-0000-4000-8000-000000000002','enrichment-other@example.invalid');
  set local role authenticated;
  perform set_config('request.jwt.claim.sub','f6000000-0000-4000-8000-000000000001',true);
  h:=public.configure_household_with_accounts(null,'Enrichment fixture','["Salaire"]','["Courses"]','[{"name":"Moi","relationship":"self","isPrimary":true}]','[{"name":"Bank","account_type":"checking"}]',null);
  select id into a from public.bank_accounts where household_id=h;
  select id into c from public.categories where household_id=h and kind='expense';
  payload:=jsonb_build_array(jsonb_build_object('fingerprint','row:2026-10-01|-1250|EUR|cafe fiction|occurrence:1','transaction_date','2026-10-01','label','Café Fiction','amount_cents',-1250,'currency','EUR','category_id',c,'flow_type','standard','source_metadata',jsonb_build_object('category_hint','Original','balance_cents',null)));
  perform public.import_bank_transactions(a,payload);
  select id into tx from public.bank_transactions where bank_account_id=a;
  update public.entries set label='Correction personnelle',flow_type='review' where bank_transaction_id=tx;
  payload:=jsonb_set(payload,'{0,value_date}','"2026-10-02"');
  payload:=jsonb_set(payload,'{0,source_metadata}','{"category_hint":"New suggestion","balance_cents":123450,"reference":"new-reference"}');
  r:=public.import_bank_transactions(a,payload);
  if (r->>'imported')::int<>0 or (select count(*) from public.bank_transactions where bank_account_id=a)<>1 then raise exception 'Reimport duplicated transaction';end if;
  if not exists(select 1 from public.bank_transactions where id=tx and value_date='2026-10-02' and source_metadata->>'category_hint'='Original' and source_metadata->>'balance_cents'='123450' and source_metadata->>'reference'='new-reference') then raise exception 'Missing details not enriched or existing detail overwritten';end if;
  if not exists(select 1 from public.entries where bank_transaction_id=tx and label='Correction personnelle' and flow_type='review') then raise exception 'User correction overwritten';end if;
  select source_metadata into before_metadata from public.bank_transactions where id=tx;
  perform public.import_bank_transactions(a,payload);
  if (select source_metadata from public.bank_transactions where id=tx) is distinct from before_metadata then raise exception 'Enrichment not idempotent';end if;
  perform set_config('request.jwt.claim.sub','f6000000-0000-4000-8000-000000000002',true);
  update public.bank_transactions set value_date='2026-10-03' where id=tx;
  if found then raise exception 'Cross-household update allowed';end if;
  perform set_config('request.jwt.claim.sub','f6000000-0000-4000-8000-000000000001',true);
  if has_column_privilege('authenticated','public.bank_transactions','amount_cents','UPDATE') then raise exception 'Financial amount update granted';end if;
  raise exception using errcode='ZX001',message='fixture verified';
 exception when sqlstate 'ZX001' then null;
 end;
end;
$test$;
