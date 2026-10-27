do $$
begin
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='households') then
  alter publication supabase_realtime add table public.households;
 end if;
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='categories') then
  alter publication supabase_realtime add table public.categories;
 end if;
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='entries') then
  alter publication supabase_realtime add table public.entries;
 end if;
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='subcategories') then
  alter publication supabase_realtime add table public.subcategories;
 end if;
end $$;
