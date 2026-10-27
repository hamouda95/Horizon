create table public.monthly_category_budgets (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 category_id uuid not null references public.categories(id) on delete cascade,
 month date not null,
 amount_cents bigint not null check (amount_cents >= 0),
 created_at timestamptz not null default now(),
 constraint monthly_category_budgets_month_first_day check (extract(day from month)=1),
 constraint monthly_category_budgets_unique unique (household_id,category_id,month)
);
alter table public.monthly_category_budgets enable row level security;
grant select,insert,update,delete on public.monthly_category_budgets to authenticated;
create policy monthly_category_budgets_household_members on public.monthly_category_budgets
 for all to authenticated
 using (
  exists (select 1 from public.household_members m where m.household_id=monthly_category_budgets.household_id and m.user_id=(select auth.uid()))
  and exists (select 1 from public.categories c where c.id=monthly_category_budgets.category_id and c.household_id=monthly_category_budgets.household_id and c.kind='expense')
 )
 with check (
  exists (select 1 from public.household_members m where m.household_id=monthly_category_budgets.household_id and m.user_id=(select auth.uid()))
  and exists (select 1 from public.categories c where c.id=monthly_category_budgets.category_id and c.household_id=monthly_category_budgets.household_id and c.kind='expense')
 );
alter publication supabase_realtime add table public.monthly_category_budgets;
