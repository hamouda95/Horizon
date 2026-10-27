create or replace function public.accept_household_invite(p_token text)
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
 select i.* into v_invite
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
  on conflict on constraint household_members_pkey do nothing;
 update public.household_invites i set accepted_by=v_user_id,accepted_at=now() where i.id=v_invite.id;
 return query select v_invite.household_id,v_name;
end;
$$;