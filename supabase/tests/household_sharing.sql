-- Run after the household-sharing migration with at least three auth.users fixtures.
-- The transaction creates test rows, exercises authenticated RLS/RPC paths, then rolls back.
begin;
select set_config('test.owner_id',(select u.id::text from auth.users u where not exists(select 1 from public.households h where h.owner_id=u.id) order by u.id limit 1),true);
select set_config('test.member_id',(select h.owner_id::text from public.households h order by h.created_at,h.id limit 1),true);
select set_config('test.other_id',(select h.owner_id::text from public.households h order by h.created_at,h.id offset 1 limit 1),true);
select set_config('test.other_email',(select coalesce(u.email,'') from auth.users u where u.id=(select h.owner_id from public.households h order by h.created_at,h.id offset 1 limit 1)),true);
select set_config('test.other_home_id',(select h.id::text from public.households h order by h.created_at,h.id offset 1 limit 1),true);
set local role authenticated;

do $test$
declare
 v_owner uuid := current_setting('test.owner_id')::uuid;
 v_member uuid := current_setting('test.member_id')::uuid;
 v_other uuid := current_setting('test.other_id')::uuid;
 v_home uuid;
 v_other_home uuid := current_setting('test.other_home_id')::uuid;
 v_category uuid;
 v_other_category uuid;
 v_entry uuid;
 v_movement uuid;
 v_goal uuid;
 v_other_goal uuid;
 v_obligation uuid;
 v_document uuid;
 v_token text;
 v_email_token text;
 v_email text;
 v_joined uuid;
 v_count integer;
 v_rejected boolean;
begin
 if v_owner=v_member or v_owner=v_other or v_member=v_other then
  raise exception using errcode='XX000',message='Fixture identities must be distinct';
 end if;
 v_email:=current_setting('test.other_email');
 if v_email='' then raise exception using errcode='XX000',message='Invitee email fixture is missing'; end if;

 perform set_config('request.jwt.claim.sub',v_other::text,true);
 insert into public.categories(household_id,kind,name) values(v_other_home,'expense','Temporary other household category') returning id into v_other_category;
 insert into public.household_savings_goals(household_id,title,target_cents) values(v_other_home,'Other household goal',50000) returning id into v_other_goal;
 perform set_config('request.jwt.claim.sub',v_owner::text,true);
 insert into public.households(owner_id,name) values(v_owner,'transactional sharing test') returning id into v_home;
 insert into public.categories(household_id,kind,name) values(v_home,'expense','Test category') returning id into v_category;
 insert into public.household_savings_goals(household_id,title,target_cents,target_date) values(v_home,'Test goal',100000,current_date+90) returning id into v_goal;
 insert into public.household_obligations(household_id,category_id,title,amount_cents,frequency,due_day,due_month)
  values(v_home,v_category,'Test annual bill',12000,'annual',15,7) returning id into v_obligation;
 insert into public.household_documents(household_id,storage_path,file_name,file_size_bytes,mime_type,document_type,uploaded_by)
  values(v_home,format('%s/%s/test.pdf',v_home,gen_random_uuid()),'test.pdf',100,'application/pdf','receipt',v_owner) returning id into v_document;
 insert into public.entries(household_id,category_id,kind,label,amount_cents,entry_date)
  values(v_home,v_category,'expense','Test entry',100,current_date) returning id into v_entry;
 insert into public.monthly_budgets(household_id,month,income_cents,expense_cents)
  values(v_home,date_trunc('month',current_date)::date,1000,100);
 insert into public.monthly_category_budgets(household_id,category_id,month,amount_cents)
  values(v_home,v_category,date_trunc('month',current_date)::date,500);
 insert into public.savings_movements(household_id,movement_type,amount_cents,movement_date,note,goal_id)
  values(v_home,'deposit',3000,current_date,'test deposit',v_goal) returning id into v_movement;
 insert into public.subcategories(household_id,category_id,kind,name)
  values(v_home,v_category,'expense','Test subcategory');
 select invite_token into v_token from public.create_household_invite(v_home,null);
 if v_token is null or char_length(v_token)<>64 then
  raise exception using errcode='XX000',message='Invitation token generation failed';
 end if;
 select count(*) into v_count from public.households where id=v_home;
 if v_count<>1 then raise exception using errcode='XX000',message='Owner lost access to their household'; end if;
 select count(*) into v_count from public.list_household_members(v_home);
 if v_count<>1 then raise exception using errcode='XX000',message='Owner member listing failed'; end if;

 perform set_config('request.jwt.claim.sub',v_other::text,true);
 select count(*) into v_count from public.households where id=v_home;
 if v_count<>0 then raise exception using errcode='XX000',message='Uninvited user can read another household'; end if;

 perform set_config('request.jwt.claim.sub',v_member::text,true);
 select count(*) into v_count from public.households where id=v_home;
 if v_count<>0 then raise exception using errcode='XX000',message='Household is visible before invite acceptance'; end if;
 select household_id into v_joined from public.accept_household_invite(v_token);
 if v_joined<>v_home then raise exception using errcode='XX000',message='Invite accepted into the wrong household'; end if;
 select count(*) into v_count from public.categories where household_id=v_home;
 if v_count<>1 then raise exception using errcode='XX000',message='Member cannot read household categories'; end if;
 select count(*) into v_count from public.entries where household_id=v_home;
 if v_count<>1 then raise exception using errcode='XX000',message='Member cannot read household entries'; end if;
 select count(*) into v_count from public.monthly_budgets where household_id=v_home;
 if v_count<>1 then raise exception using errcode='XX000',message='Member cannot read household budgets'; end if;
 select count(*) into v_count from public.monthly_category_budgets where household_id=v_home;
 if v_count<>1 then raise exception using errcode='XX000',message='Member cannot read category envelopes'; end if;
 select count(*) into v_count from public.savings_movements where household_id=v_home;
 if v_count<>1 then raise exception using errcode='XX000',message='Member cannot read savings movements'; end if;
 select count(*) into v_count from public.household_savings_goals where household_id=v_home;
 if v_count<>1 then raise exception using errcode='XX000',message='Member cannot read savings goals'; end if;
 select count(*) into v_count from public.household_obligations where household_id=v_home;
 if v_count<>1 then raise exception using errcode='XX000',message='Member cannot read household obligations'; end if;
 select count(*) into v_count from public.household_documents where household_id=v_home;
 if v_count<>1 then raise exception using errcode='XX000',message='Member cannot read household documents'; end if;
 update public.household_savings_goals set target_cents=120000 where id=v_goal;
 if not found then raise exception using errcode='XX000',message='Member cannot update a savings goal'; end if;
 update public.household_obligations set amount_cents=12500 where id=v_obligation;
 if not found then raise exception using errcode='XX000',message='Member cannot update a household obligation'; end if;
 insert into public.savings_movements(household_id,movement_type,amount_cents,movement_date,goal_id)
  values(v_home,'withdrawal',500,current_date,v_goal);
 if not found then raise exception using errcode='XX000',message='Member cannot link a movement to a savings goal'; end if;
 insert into public.savings_movements(household_id,movement_type,amount_cents,movement_date)
  values(v_home,'withdrawal',500,current_date);
 select count(*) into v_count from public.savings_movements where household_id=v_home;
 if v_count<>3 then raise exception using errcode='XX000',message='Member cannot add savings movements'; end if;
 select count(*) into v_count from public.subcategories where household_id=v_home;
 if v_count<>1 then raise exception using errcode='XX000',message='Member cannot read household subcategories'; end if;
 insert into public.categories(household_id,kind,name) values(v_home,'expense','Member category');
 update public.monthly_category_budgets set amount_cents=750 where household_id=v_home and category_id=v_category;
 if not found then raise exception using errcode='XX000',message='Member cannot update category envelopes'; end if;
 update public.entries set label='Updated by member' where id=v_entry;
 if not found then raise exception using errcode='XX000',message='Member cannot update household entries'; end if;
 begin
  update public.entries set household_id=v_other_home where id=v_entry;
  raise exception using errcode='XX000',message='A member reassigned an entry to another household';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.monthly_category_budgets set household_id=v_other_home where household_id=v_home and category_id=v_category;
  raise exception using errcode='XX000',message='A member reassigned an envelope to another household';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.monthly_category_budgets(household_id,category_id,month,amount_cents)
   values(v_home,v_other_category,date_trunc('month',current_date)::date,100);
  raise exception using errcode='XX000',message='A member attached an envelope to another household category';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.savings_movements set household_id=v_other_home where id=v_movement;
  raise exception using errcode='XX000',message='A member reassigned a savings movement to another household';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.savings_movements set goal_id=v_other_goal where id=v_movement;
  raise exception using errcode='XX000',message='A member linked a movement to another household goal';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.household_obligations set household_id=v_other_home where id=v_obligation;
  raise exception using errcode='XX000',message='A member reassigned an obligation to another household';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.household_documents(household_id,storage_path,file_name,file_size_bytes,mime_type,document_type,uploaded_by)
   values(v_other_home,format('%s/%s/other.pdf',v_other_home,gen_random_uuid()),'other.pdf',100,'application/pdf','receipt',v_member);
  raise exception using errcode='XX000',message='A member added a document to another household';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.household_members(household_id,user_id,role) values(v_home,v_other,'member');
  raise exception using errcode='XX000',message='A member directly added another user';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.remove_household_member(v_home,v_member);
  raise exception using errcode='XX000',message='A member removed another member';
 exception when insufficient_privilege then null;
 end;
 v_email:=current_setting('test.other_email');
 perform set_config('request.jwt.claim.sub',v_owner::text,true);
 select invite_token into v_email_token from public.create_household_invite(v_home,v_email);
 perform set_config('request.jwt.claim.sub',v_member::text,true);
 v_rejected:=false;
 begin
  perform public.accept_household_invite(v_email_token);
 exception when insufficient_privilege then
  v_rejected:=true;
 end;
 if not v_rejected then raise exception using errcode='XX000',message='An invitation email restriction was bypassed'; end if;
 perform set_config('request.jwt.claim.sub',v_other::text,true);
 v_rejected:=false;
 begin
  perform public.accept_household_invite(v_token);
 exception when sqlstate 'P0001' then
  v_rejected:=true;
 end;
 if not v_rejected then raise exception using errcode='XX000',message='A used invite was accepted by a second user'; end if;
end;
$test$;

rollback;
