revoke update on table public.bank_accounts from authenticated;
grant update (balance_cents,balance_as_of) on table public.bank_accounts to authenticated;

drop policy bank_accounts_insert_members on public.bank_accounts;
create policy bank_accounts_insert_import_owner on public.bank_accounts for insert to authenticated
 with check (
  provider='import'
  and owner_user_id=(select auth.uid())
  and exists(select 1 from public.household_members m where m.household_id=bank_accounts.household_id and m.user_id=(select auth.uid()))
 );

drop policy bank_accounts_update_owner on public.bank_accounts;
create policy bank_accounts_update_import_owner on public.bank_accounts for update to authenticated
 using (provider='import' and owner_user_id=(select auth.uid()))
 with check (provider='import' and owner_user_id=(select auth.uid()));
