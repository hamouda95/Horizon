drop policy if exists households_members_select on public.households;
drop policy if exists categories_household_members on public.categories;
drop policy if exists entries_household_members on public.entries;
drop policy if exists budgets_household_members on public.monthly_budgets;
drop policy if exists subcategories_household_members on public.subcategories;

drop trigger if exists households_add_owner_membership on public.households;
drop function if exists public.assign_household_owner_member();
drop function if exists public.create_household_invite(uuid,text);
drop function if exists public.accept_household_invite(text);
drop function if exists public.list_household_members(uuid);
drop function if exists public.remove_household_member(uuid,uuid);

drop table if exists public.household_invites;
drop table if exists public.household_members;
