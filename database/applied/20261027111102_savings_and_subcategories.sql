-- Copie de la migration appliquée ; archive hors du répertoire CLI.\nalter table public.households add column savings_rate_bps integer check (savings_rate_bps between 0 and 10000);
create table public.subcategories (
 id uuid primary key default gen_random_uuid(),
 category_id uuid not null,
 household_id uuid not null,
 kind text not null check (kind in ('income','expense')),
 name text not null check (char_length(trim(name)) between 1 and 60),
 unique (id,category_id,household_id,kind),
 unique (category_id,name),
 foreign key (category_id,household_id,kind) references public.categories(id,household_id,kind) on delete cascade
);
alter table public.entries add column subcategory_id uuid;
alter table public.entries add constraint entry_subcategory_fk foreign key (subcategory_id,category_id,household_id,kind) references public.subcategories(id,category_id,household_id,kind) on delete restrict;
create index entries_subcategory_idx on public.entries(subcategory_id,category_id,household_id,kind);
alter table public.subcategories enable row level security;
revoke all on public.subcategories from public, anon, authenticated;
grant select,insert,update,delete on public.subcategories to authenticated;
create policy subcategories_owner_select on public.subcategories for select to authenticated using (exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid())));
create policy subcategories_owner_insert on public.subcategories for insert to authenticated with check (exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid())));
create policy subcategories_owner_update on public.subcategories for update to authenticated using (exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid()))) with check (exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid())));
create policy subcategories_owner_delete on public.subcategories for delete to authenticated using (exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid())));