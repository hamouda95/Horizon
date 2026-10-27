-- Copie de la migration appliquée, archive hors du répertoire CLI.\ncreate table public.monthly_budgets (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 month date not null check (extract(day from month)=1),
 income_cents bigint not null default 0 check (income_cents between 0 and 100000000000),
 expense_cents bigint not null default 0 check (expense_cents between 0 and 100000000000),
 unique (household_id,month)
);
alter table public.monthly_budgets enable row level security;
revoke all on public.monthly_budgets from public, anon, authenticated;
grant select,insert,update,delete on public.monthly_budgets to authenticated;
create policy budgets_owner_select on public.monthly_budgets for select to authenticated using (exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid())));
create policy budgets_owner_insert on public.monthly_budgets for insert to authenticated with check (exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid())));
create policy budgets_owner_update on public.monthly_budgets for update to authenticated using (exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid()))) with check (exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid())));
create policy budgets_owner_delete on public.monthly_budgets for delete to authenticated using (exists (select 1 from public.households h where h.id=household_id and h.owner_id=(select auth.uid())));