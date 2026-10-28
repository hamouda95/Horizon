do $$
begin
 if not exists (
  select 1 from pg_publication_tables
  where pubname='supabase_realtime' and schemaname='public' and tablename='household_people'
 ) then
  alter publication supabase_realtime add table public.household_people;
 end if;
end
$$;
