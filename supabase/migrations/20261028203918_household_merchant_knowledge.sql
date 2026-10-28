-- Store only household-approved merchant/category associations, not raw statement rows.
create table public.household_merchant_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  merchant_key text not null check (char_length(btrim(merchant_key)) between 2 and 120),
  merchant_label text not null check (char_length(btrim(merchant_label)) between 1 and 120),
  kind text not null check (kind in ('income','expense')),
  category_id uuid not null,
  subcategory_id uuid,
  sample_count integer not null default 1 check (sample_count between 1 and 1000000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, merchant_key, kind),
  constraint household_merchant_rules_category_scope_fkey
    foreign key (category_id, household_id, kind)
    references public.categories(id, household_id, kind) on delete cascade,
  constraint household_merchant_rules_subcategory_scope_fkey
    foreign key (subcategory_id, category_id, household_id, kind)
    references public.subcategories(id, category_id, household_id, kind) on delete cascade
);

create index household_merchant_rules_household_kind_idx
  on public.household_merchant_rules(household_id, kind, merchant_key);

alter table public.household_merchant_rules enable row level security;
revoke all on public.household_merchant_rules from public, anon, authenticated;
grant select, insert, update, delete on public.household_merchant_rules to authenticated;

create policy household_merchant_rules_members_read
  on public.household_merchant_rules for select to authenticated
  using (exists (
    select 1 from public.household_members m
    where m.household_id = household_merchant_rules.household_id
      and m.user_id = (select auth.uid())
  ));

create policy household_merchant_rules_members_insert
  on public.household_merchant_rules for insert to authenticated
  with check (exists (
    select 1 from public.household_members m
    where m.household_id = household_merchant_rules.household_id
      and m.user_id = (select auth.uid())
  ) and (created_by is null or created_by = (select auth.uid())));

create policy household_merchant_rules_members_update
  on public.household_merchant_rules for update to authenticated
  using (exists (
    select 1 from public.household_members m
    where m.household_id = household_merchant_rules.household_id
      and m.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.household_members m
    where m.household_id = household_merchant_rules.household_id
      and m.user_id = (select auth.uid())
  ) and (created_by is null or created_by = (select auth.uid())));

create policy household_merchant_rules_members_delete
  on public.household_merchant_rules for delete to authenticated
  using (exists (
    select 1 from public.household_members m
    where m.household_id = household_merchant_rules.household_id
      and m.user_id = (select auth.uid())
  ));
