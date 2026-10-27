create table public.household_savings_goals (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 80),
 target_cents bigint not null check (target_cents > 0),
 target_date date,
 created_at timestamptz not null default now()
);
alter table public.household_savings_goals enable row level security;
grant select,insert,update,delete on public.household_savings_goals to authenticated;
create policy household_savings_goals_members on public.household_savings_goals
 for all to authenticated
 using (exists(select 1 from public.household_members m where m.household_id=household_savings_goals.household_id and m.user_id=(select auth.uid())))
 with check (exists(select 1 from public.household_members m where m.household_id=household_savings_goals.household_id and m.user_id=(select auth.uid())));

alter table public.savings_movements add column goal_id uuid references public.household_savings_goals(id) on delete set null;
drop policy savings_movements_household_members on public.savings_movements;
create policy savings_movements_household_members on public.savings_movements
 for all to authenticated
 using (
  exists(select 1 from public.household_members m where m.household_id=savings_movements.household_id and m.user_id=(select auth.uid()))
  and (goal_id is null or exists(select 1 from public.household_savings_goals g where g.id=savings_movements.goal_id and g.household_id=savings_movements.household_id))
 )
 with check (
  exists(select 1 from public.household_members m where m.household_id=savings_movements.household_id and m.user_id=(select auth.uid()))
  and (goal_id is null or exists(select 1 from public.household_savings_goals g where g.id=savings_movements.goal_id and g.household_id=savings_movements.household_id))
 );

create table public.household_obligations (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 category_id uuid references public.categories(id) on delete set null,
 title text not null check (char_length(btrim(title)) between 1 and 100),
 amount_cents bigint not null check (amount_cents > 0),
 frequency text not null check (frequency in ('monthly','annual')),
 due_day smallint not null check (due_day between 1 and 31),
 due_month smallint check (due_month between 1 and 12),
 note text check (note is null or char_length(btrim(note))<=180),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 constraint household_obligations_frequency_month check (
  (frequency='monthly' and due_month is null) or (frequency='annual' and due_month is not null)
 )
);
create index household_obligations_household_idx on public.household_obligations(household_id,active,frequency,due_month,due_day);
alter table public.household_obligations enable row level security;
grant select,insert,update,delete on public.household_obligations to authenticated;
create policy household_obligations_members on public.household_obligations
 for all to authenticated
 using (
  exists(select 1 from public.household_members m where m.household_id=household_obligations.household_id and m.user_id=(select auth.uid()))
  and (category_id is null or exists(select 1 from public.categories c where c.id=household_obligations.category_id and c.household_id=household_obligations.household_id and c.kind='expense'))
 )
 with check (
  exists(select 1 from public.household_members m where m.household_id=household_obligations.household_id and m.user_id=(select auth.uid()))
  and (category_id is null or exists(select 1 from public.categories c where c.id=household_obligations.category_id and c.household_id=household_obligations.household_id and c.kind='expense'))
 );

create table public.household_documents (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 storage_path text not null unique,
 file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
 file_size_bytes bigint not null check (file_size_bytes between 1 and 10485760),
 mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
 document_type text not null check (document_type in ('receipt','income','household')),
 note text check (note is null or char_length(btrim(note))<=180),
 uploaded_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 constraint household_documents_path_scope check (storage_path like household_id::text || '/%')
);
alter table public.household_documents enable row level security;
grant select,insert,delete on public.household_documents to authenticated;
create policy household_documents_select_members on public.household_documents for select to authenticated
 using (exists(select 1 from public.household_members m where m.household_id=household_documents.household_id and m.user_id=(select auth.uid())));
create policy household_documents_insert_members on public.household_documents for insert to authenticated
 with check (uploaded_by=(select auth.uid()) and exists(select 1 from public.household_members m where m.household_id=household_documents.household_id and m.user_id=(select auth.uid())));
create policy household_documents_delete_members on public.household_documents for delete to authenticated
 using (exists(select 1 from public.household_members m where m.household_id=household_documents.household_id and m.user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('household_documents','household_documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
 on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy household_documents_storage_select on storage.objects for select to authenticated
 using(bucket_id='household_documents' and exists(select 1 from public.household_members m where m.household_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid())));
create policy household_documents_storage_insert on storage.objects for insert to authenticated
 with check(bucket_id='household_documents' and exists(select 1 from public.household_members m where m.household_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid())));
create policy household_documents_storage_delete on storage.objects for delete to authenticated
 using(bucket_id='household_documents' and exists(select 1 from public.household_members m where m.household_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid())));

alter publication supabase_realtime add table public.household_savings_goals;
alter publication supabase_realtime add table public.household_obligations;
alter publication supabase_realtime add table public.household_documents;
