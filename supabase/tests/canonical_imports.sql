begin;
insert into auth.users(id,email) values('f3000000-0000-4000-8000-000000000001','canonical-owner@example.invalid'),('f3000000-0000-4000-8000-000000000002','canonical-other@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','f3000000-0000-4000-8000-000000000001',true);
do $$
declare h uuid; a uuid; b uuid; c uuid; payload jsonb; n integer; x jsonb; rejected boolean;
begin
 h:=public.configure_household_with_accounts(null,'Canonical fixture','["Salaire"]','["Courses"]','[{"name":"Moi","relationship":"self","isPrimary":true}]','[{"name":"Bank","account_type":"checking","balance_cents":100000,"balance_date":"2026-10-30"},{"name":"Cash","account_type":"cash","balance_cents":1000,"balance_date":"2026-10-30"}]',null);
 select id into a from public.bank_accounts where household_id=h and account_type='checking';select id into b from public.bank_accounts where household_id=h and account_type='cash';select id into c from public.categories where household_id=h and kind='expense';
 perform set_config('test.canonical.household',h::text,true);perform set_config('test.canonical.account',a::text,true);perform set_config('test.canonical.category',c::text,true);
 payload:=jsonb_build_array(jsonb_build_object('fingerprint','row:2026-10-30|-1250|EUR|cafe fiction|occurrence:1','transaction_date','2026-10-30','label','Café Fiction','amount_cents',-1250,'currency','EUR','category_id',c,'flow_type','standard'));
 x:=public.import_bank_transactions(a,payload);if (x->>'imported')::int<>1 then raise exception 'First import failed';end if;
 x:=public.import_bank_transactions(a,jsonb_set(jsonb_set(payload,'{0,fingerprint}','"row:2026-10-30|-1250|EUR|cafe fiction|id:ofx"'),'{0,external_id}','"ofx"'));if (x->>'imported')::int<>0 or (select count(*) from public.bank_transactions where bank_account_id=a)<>1 then raise exception 'OFX versus QIF duplicated';end if;
 x:=public.import_bank_transactions(a,jsonb_set(payload,'{0,fingerprint}','"row:2026-10-30|-1250|EUR|cafe fiction|occurrence:2"'));if (x->>'imported')::int<>1 then raise exception 'Genuine second equal operation lost';end if;
 perform public.import_bank_transactions(a,jsonb_set(payload,'{0,fingerprint}','"row:2026-10-30|-1250|EUR|cafe fiction|occurrence:2"'));if (select count(*) from public.entries where household_id=h)<>2 then raise exception 'Occurrence reimport duplicated';end if;
 x:=public.import_bank_transactions(b,payload);if (x->>'imported')::int<>0 then raise exception 'Cross account duplicate accepted';end if;
 x:=public.import_bank_transactions(b,jsonb_set(payload,'{0,source_metadata}','{"duplicate_override":true}'));if (x->>'imported')::int<>1 then raise exception 'Explicit cross-account override rejected';end if;
 perform public.ensure_classification_reference(h,'[{"name":"Revenus locatifs","kind":"income","subcategories":["Loyers"]}]');perform public.ensure_classification_reference(h,'[{"name":"Revenus locatifs","kind":"income","subcategories":["Loyers"]}]');if (select count(*) from public.subcategories where household_id=h and name='Loyers')<>1 then raise exception 'Taxonomy not idempotent';end if;
 perform set_config('request.jwt.claim.sub','f3000000-0000-4000-8000-000000000002',true);
 rejected:=false;begin perform public.resolve_bank_duplicates(h,array[(select id from public.bank_transactions where bank_account_id=a limit 1)]);exception when insufficient_privilege then rejected:=true;end;if not rejected then raise exception 'Repair scope bypass';end if;
end;
$$;
reset role;
-- Simulate pre-migration legacy copies only in a disposable fixture, rolled back below.

insert into public.bank_transactions(household_id,bank_account_id,fingerprint,external_id,transaction_date,label,amount_cents,currency,source_metadata)
values(current_setting('test.canonical.household')::uuid,current_setting('test.canonical.account')::uuid,'legacy-copy','legacy-ofx','2026-10-30','Temporary distinct fixture',-1250,'EUR','{}');
update public.bank_transactions set label='Café Fiction' where fingerprint='legacy-copy' and bank_account_id=current_setting('test.canonical.account')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','f3000000-0000-4000-8000-000000000001',true);
do $$
declare h uuid:=current_setting('test.canonical.household')::uuid; a uuid:=current_setting('test.canonical.account')::uuid; keeper uuid; n integer;
begin
 select bank_transaction_id into keeper from public.entries where household_id=h and bank_transaction_id in(select id from public.bank_transactions where bank_account_id=a and occurrence_index=1) limit 1;
 n:=public.resolve_bank_duplicates(h,array[keeper]);if n<>1 or public.bank_duplicate_count(h)<>0 then raise exception 'Legacy repair failed';end if;
 if (select count(*) from public.entries where household_id=h)<>3 then raise exception 'Budget entries changed incorrectly';end if;
 if (select balance_cents from public.bank_accounts where id=a)<>100000 then raise exception 'Repair altered balance';end if;
 if not exists(select 1 from public.bank_transactions where id=keeper and source_metadata->'deduplicated_references'?'legacy-ofx') then raise exception 'External alias lost';end if;
end;
$$;
rollback;
