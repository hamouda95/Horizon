begin;
insert into auth.users(id,email) values('f1000000-0000-4000-8000-000000000001','account-fixture-a@example.invalid'),('f1000000-0000-4000-8000-000000000002','account-fixture-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
do $$
declare h uuid; a uuid; b uuid; c uuid; cat uuid; result jsonb; rejected boolean;
begin
 h:=public.configure_household(null,'Account fixtures','["Salaire"]','["Courses"]','[{"name":"Moi","relationship":"self","isPrimary":true}]');
 select id into cat from public.categories where household_id=h and kind='expense';
 insert into public.bank_accounts(household_id,owner_user_id,provider,external_account_id,name,account_type,currency,balance_cents,balance_as_of)
 values(h,auth.uid(),'import','fixture-a','First','savings','EUR',10000,'2026-10-01') returning id into a;
 insert into public.bank_accounts(household_id,owner_user_id,provider,external_account_id,name,account_type,currency,balance_cents,balance_as_of)
 values(h,auth.uid(),'import','fixture-b','Second','savings','EUR',20000,'2026-10-02') returning id into b;
 update public.bank_accounts set name='Renamed',source_name='Fixture bank',account_type='savings' where id=a;
 if not found then raise exception 'Owner could not edit account'; end if;
 result:=public.import_bank_transactions(a,jsonb_build_array(jsonb_build_object('fingerprint','fixture:one','transaction_date',current_date,'label','Fixture expense','amount_cents',-100,'currency','EUR','category_id',cat)));
 if result->>'imported'<>'1' then raise exception 'First import failed'; end if;
 result:=public.import_bank_transactions(b,jsonb_build_array(jsonb_build_object('fingerprint','fixture:one','transaction_date',current_date,'label','Fixture expense','amount_cents',-100,'currency','EUR','category_id',cat)));
 if result->>'imported'<>'0' or result->>'duplicates'<>'1' then raise exception 'Repeated import across own accounts was not blocked'; end if;
 result:=public.import_bank_transactions(b,jsonb_build_array(jsonb_build_object('fingerprint','fixture:one','transaction_date',current_date,'label','Fixture expense','amount_cents',-100,'currency','EUR','category_id',cat,'source_metadata',jsonb_build_object('duplicate_override',true))));
 if result->>'imported'<>'1' then raise exception 'Explicit override was rejected'; end if;
 result:=public.import_bank_transactions(b,jsonb_build_array(jsonb_build_object('fingerprint','fixture:two','transaction_date',current_date,'label','Unique expense','amount_cents',-200,'currency','EUR','category_id',cat)));
 perform set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
 rejected:=false;
 begin perform public.merge_import_accounts(a,b);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Another user merged private accounts'; end if;
 perform set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
 result:=public.merge_import_accounts(b,a);
 if result->>'duplicates'<>'1' or result->>'moved'<>'1' then raise exception 'Merge did not preserve unique operations';end if;
 if (select count(*) from public.entries where household_id=h)<>2 then raise exception 'Merge duplicated or lost entries';end if;
 if (select balance_cents from public.bank_accounts where id=a)<>20000 then raise exception 'Merge summed balances instead of taking the latest snapshot';end if;
 if exists(select 1 from public.bank_accounts where id=b) then raise exception 'Source account still exists';end if;
end;
$$;
rollback;
