-- Add household membership and one-time invitations without changing existing owner policies.

create table public.household_members (
 household_id uuid not null references public.households(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member' check (role in ('owner','member')),
 joined_at timestamptz not null default now(),
 primary key (household_id,user_id)
);

create unique index household_members_single_owner_idx
 on public.household_members (household_id) where role='owner';

alter table public.household_members enable row level security;
revoke all on public.household_members from public,anon,authenticated;
grant select (household_id,user_id,role,joined_at) on public.household_members to authenticated;

create policy household_members_read_self on public.household_members
 for select to authenticated using (user_id=(select auth.uid()));

create function public.assign_household_owner_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
 insert into public.household_members (household_id,user_id,role)
 values (new.id,new.owner_id,'owner');
 return new;
end;
$$;

revoke all on function public.assign_household_owner_member() from public,anon,authenticated;

create trigger households_add_owner_membership
 after insert on public.households
 for each row execute function public.assign_household_owner_member();

insert into public.household_members (household_id,user_id,role)
select h.id,h.owner_id,'owner'
from public.households h
on conflict (household_id,user_id) do nothing;

create table public.household_invites (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 invited_email text,
 created_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 accepted_by uuid references auth.users(id) on delete set null,
 accepted_at timestamptz,
 check (invited_email is null or (invited_email=lower(btrim(invited_email)) and char_length(invited_email)<=254)),
 check ((accepted_by is null)=(accepted_at is null))
);

create index household_invites_household_created_idx
 on public.household_invites (household_id,created_at desc);

alter table public.household_invites enable row level security;
revoke all on public.household_invites from public,anon,authenticated;
grant select (id,household_id,invited_email,created_by,created_at,expires_at,accepted_by,accepted_at)
 on public.household_invites to authenticated;
grant delete on public.household_invites to authenticated;

create policy household_invites_owner_select on public.household_invites
 for select to authenticated using (
  exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid()))
 );
create policy household_invites_owner_delete on public.household_invites
 for delete to authenticated using (
  accepted_at is null and
  exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid()))
 );

create function public.create_household_invite(p_household_id uuid,p_invited_email text default null)
returns table(invite_id uuid,invite_token text,expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_user_id uuid := auth.uid();
 v_email text := nullif(lower(btrim(p_invited_email)),'');
 v_token text := encode(extensions.gen_random_bytes(32),'hex');
 v_expiry timestamptz := now()+interval '7 days';
 v_pending integer;
begin
 if v_user_id is null then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 if not exists (select 1 from public.households h where h.id=p_household_id and h.owner_id=v_user_id) then
  raise exception 'Only the household owner can create invitations' using errcode='42501';
 end if;
 if v_email is not null and (char_length(v_email)>254 or position('@' in v_email)<2 or v_email ~ '[[:space:]]') then
  raise exception 'Enter a valid email address' using errcode='22023';
 end if;
 select count(*) into v_pending from public.household_invites i
  where i.household_id=p_household_id and i.accepted_at is null and i.expires_at>now();
 if v_pending>=10 then
  raise exception 'This household already has the maximum number of active invitations' using errcode='22023';
 end if;
 return query
  insert into public.household_invites as i (household_id,token_hash,invited_email,created_by,expires_at)
  values (p_household_id,encode(extensions.digest(v_token,'sha256'),'hex'),v_email,v_user_id,v_expiry)
  returning i.id,v_token,i.expires_at;
end;
$$;

create function public.accept_household_invite(p_token text)
returns table(household_id uuid,household_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_user_id uuid := auth.uid();
 v_token_hash text;
 v_invite public.household_invites%rowtype;
 v_owner_id uuid;
 v_name text;
 v_email text;
begin
 if v_user_id is null then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 if p_token is null or char_length(p_token)<>64 or p_token !~ '^[0-9a-f]{64}$' then
  raise exception 'Invitation is invalid or expired' using errcode='P0001';
 end if;
 v_token_hash:=encode(extensions.digest(p_token,'sha256'),'hex');
 select i into v_invite
  from public.household_invites i
  where i.token_hash=v_token_hash
  for update;
 select h.owner_id,h.name into v_owner_id,v_name
  from public.households h where h.id=v_invite.household_id;
 if not found or v_invite.expires_at<=now() or v_owner_id is null then
  raise exception 'Invitation is invalid or expired' using errcode='P0001';
 end if;
 if v_invite.accepted_at is not null then
  if v_invite.accepted_by=v_user_id then
   return query select v_invite.household_id,v_name;
   return;
  end if;
  raise exception 'Invitation has already been used' using errcode='P0001';
 end if;
 if v_owner_id=v_user_id then
  raise exception 'You already own this household' using errcode='P0001';
 end if;
 if v_invite.invited_email is not null then
  v_email:=lower(coalesce(auth.jwt()->>'email',''));
  if v_email<>v_invite.invited_email then
   raise exception 'This invitation was sent to a different email address' using errcode='42501';
  end if;
 end if;
 insert into public.household_members (household_id,user_id,role)
  values (v_invite.household_id,v_user_id,'member')
  on conflict (household_id,user_id) do nothing;
 update public.household_invites i set accepted_by=v_user_id,accepted_at=now() where i.id=v_invite.id;
 return query select v_invite.household_id,v_name;
end;
$$;

create function public.list_household_members(p_household_id uuid)
returns table(user_id uuid,role text,email text,joined_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not exists (select 1 from public.households h where h.id=p_household_id and h.owner_id=auth.uid()) then
  raise exception 'Only the household owner can view member details' using errcode='42501';
 end if;
 return query
  select m.user_id,m.role,u.email::text,m.joined_at
  from public.household_members m
  join auth.users u on u.id=m.user_id
  where m.household_id=p_household_id
  order by m.joined_at,m.user_id;
end;
$$;

create function public.remove_household_member(p_household_id uuid,p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not exists (select 1 from public.households h where h.id=p_household_id and h.owner_id=auth.uid()) then
  raise exception 'Only the household owner can remove members' using errcode='42501';
 end if;
 delete from public.household_members m
  where m.household_id=p_household_id and m.user_id=p_user_id and m.role='member';
 if not found then
  raise exception 'Member not found or cannot be removed' using errcode='P0001';
 end if;
end;
$$;

revoke all on function public.create_household_invite(uuid,text) from public,anon;
revoke all on function public.accept_household_invite(text) from public,anon;
revoke all on function public.list_household_members(uuid) from public,anon;
revoke all on function public.remove_household_member(uuid,uuid) from public,anon;
grant execute on function public.create_household_invite(uuid,text) to authenticated;
grant execute on function public.accept_household_invite(text) to authenticated;
grant execute on function public.list_household_members(uuid) to authenticated;
grant execute on function public.remove_household_member(uuid,uuid) to authenticated;

create policy households_members_select on public.households
 for select to authenticated using (
  exists (select 1 from public.household_members m where m.household_id=households.id and m.user_id=(select auth.uid()))
 );

create policy categories_household_members on public.categories
 for all to authenticated
 using (exists (select 1 from public.household_members m where m.household_id=categories.household_id and m.user_id=(select auth.uid())))
 with check (exists (select 1 from public.household_members m where m.household_id=categories.household_id and m.user_id=(select auth.uid())));

create policy entries_household_members on public.entries
 for all to authenticated
 using (exists (select 1 from public.household_members m where m.household_id=entries.household_id and m.user_id=(select auth.uid())))
 with check (exists (select 1 from public.household_members m where m.household_id=entries.household_id and m.user_id=(select auth.uid())));

create policy budgets_household_members on public.monthly_budgets
 for all to authenticated
 using (exists (select 1 from public.household_members m where m.household_id=monthly_budgets.household_id and m.user_id=(select auth.uid())))
 with check (exists (select 1 from public.household_members m where m.household_id=monthly_budgets.household_id and m.user_id=(select auth.uid())));

create policy subcategories_household_members on public.subcategories
 for all to authenticated
 using (exists (select 1 from public.household_members m where m.household_id=subcategories.household_id and m.user_id=(select auth.uid())))
 with check (exists (select 1 from public.household_members m where m.household_id=subcategories.household_id and m.user_id=(select auth.uid())));
