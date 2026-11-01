-- Two-step sign-in: once a user has verified an authenticator app, their household data is reachable only
-- from a session that gave the code (assurance level aal2). Accounts without an authenticator are unchanged.
create or replace function public.session_meets_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
 select coalesce(auth.jwt()->>'aal','aal1')='aal2'
  or not exists(select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified');
$$;
revoke all on function public.session_meets_mfa() from public, anon;
grant execute on function public.session_meets_mfa() to authenticated;

-- A restrictive policy is combined with AND on top of every existing policy of each protected table.
do $$
declare t record;
begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and c.relrowsecurity loop
  execute format('drop policy if exists mfa_required on public.%I',t.relname);
  execute format('create policy mfa_required on public.%I as restrictive for all to authenticated using ((select public.session_meets_mfa())) with check ((select public.session_meets_mfa()))',t.relname);
 end loop;
end $$;
