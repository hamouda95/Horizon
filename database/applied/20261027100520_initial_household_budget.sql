-- Copie de la migration Supabase appliquée (version 20261027100520).
-- Le répertoire database/applied est une archive, pas le répertoire de migrations CLI.
create table public.households (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 1 and 80),
 currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
 created_at timestamptz not null default now()
);
create table public.categories (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 kind text not null check (kind in ('income', 'expense')),
 name text not null check (char_length(trim(name)) between 1 and 60),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique (id, household_id, kind),
 unique (household_id, kind, name)
);
create table public.entries (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 category_id uuid not null,
 kind text not null check (kind in ('income', 'expense')),
 label text not null check (char_length(trim(label)) between 1 and 100),
 amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
 entry_date date not null,
 created_at timestamptz not null default now(),
 foreign key (category_id, household_id, kind) references public.categories(id, household_id, kind) on delete restrict
);
create index entries_household_date_idx on public.entries (household_id, entry_date desc);
create index entries_category_household_kind_idx on public.entries (category_id, household_id, kind);
alter table public.households enable row level security;
alter table public.categories enable row level security;
alter table public.entries enable row level security;
revoke all on public.households, public.categories, public.entries from public, anon, authenticated;
grant select, insert, update, delete on public.households, public.categories, public.entries to authenticated;
create policy households_owner_select on public.households for select to authenticated using (owner_id = (select auth.uid()));
create policy households_owner_insert on public.households for insert to authenticated with check (owner_id = (select auth.uid()));
create policy households_owner_update on public.households for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy households_owner_delete on public.households for delete to authenticated using (owner_id = (select auth.uid()));
create policy categories_owner_select on public.categories for select to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy categories_owner_insert on public.categories for insert to authenticated with check (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy categories_owner_update on public.categories for update to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid()))) with check (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy categories_owner_delete on public.categories for delete to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy entries_owner_select on public.entries for select to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy entries_owner_insert on public.entries for insert to authenticated with check (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy entries_owner_update on public.entries for update to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid()))) with check (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy entries_owner_delete on public.entries for delete to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
