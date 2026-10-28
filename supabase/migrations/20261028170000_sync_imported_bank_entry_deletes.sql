create policy bank_transactions_delete_account_owner
  on public.bank_transactions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.bank_accounts a
      where a.id = bank_transactions.bank_account_id
        and a.household_id = bank_transactions.household_id
        and (
          a.owner_user_id = (select auth.uid())
          or exists (
            select 1
            from public.households h
            where h.id = a.household_id
              and h.owner_id = (select auth.uid())
          )
        )
    )
  );

grant delete on public.bank_transactions to authenticated;

create or replace function public.delete_imported_bank_transaction(
  p_bank_transaction_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.entries
  where bank_transaction_id = p_bank_transaction_id;

  delete from public.bank_transactions
  where id = p_bank_transaction_id;

  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'Bank transaction not found or not authorized' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.delete_imported_bank_transaction(uuid) from public, anon;
grant execute on function public.delete_imported_bank_transaction(uuid) to authenticated;
