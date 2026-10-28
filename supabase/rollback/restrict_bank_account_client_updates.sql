drop policy if exists bank_accounts_update_import_owner on public.bank_accounts;
create policy bank_accounts_update_owner on public.bank_accounts for update to authenticated
 using(owner_user_id=(select auth.uid()) or exists(select 1 from public.households h where h.id=bank_accounts.household_id and h.owner_id=(select auth.uid())))
 with check(exists(select 1 from public.household_members m where m.household_id=bank_accounts.household_id and m.user_id=(select auth.uid())));

drop policy if exists bank_accounts_insert_import_owner on public.bank_accounts;
create policy bank_accounts_insert_members on public.bank_accounts for insert to authenticated
 with check(owner_user_id=(select auth.uid()) and exists(select 1 from public.household_members m where m.household_id=bank_accounts.household_id and m.user_id=(select auth.uid())));

revoke update (balance_cents,balance_as_of) on table public.bank_accounts from authenticated;
grant update on table public.bank_accounts to authenticated;
