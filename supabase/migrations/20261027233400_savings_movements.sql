create table public.savings_movements (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 movement_type text not null check (movement_type in ('deposit','withdrawal')),
 amount_cents bigint not null check (amount_cents > 0),
 movement_date date not null,
 note text check (note is null or char_length(btrim(note))<=120),
 created_at timestamptz not null default now()
);
create index savings_movements_household_date_idx on public.savings_movements(household_id,movement_date desc,id desc);
alter table public.savings_movements enable row level security;
grant select,insert,update,delete on public.savings_movements to authenticated;
create policy savings_movements_household_members on public.savings_movements
 for all to authenticated
 using (exists (select 1 from public.household_members m where m.household_id=savings_movements.household_id and m.user_id=(select auth.uid())))
 with check (exists (select 1 from public.household_members m where m.household_id=savings_movements.household_id and m.user_id=(select auth.uid())));
alter publication supabase_realtime add table public.savings_movements;
