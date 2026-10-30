create index bank_transactions_transfer_lookup_idx on public.bank_transactions(household_id,transaction_date,amount_cents,currency);
-- Keep the original statements; reconcile only unique opposite records on the same owner's accounts.
create function public.is_internal_bank_transfer(p_label text,p_metadata jsonb)
returns boolean language sql immutable security invoker set search_path='' as $$
 select regexp_replace(lower(normalize(coalesce(p_label,'')||' '||coalesce(p_metadata->>'category_hint','')||' '||coalesce(p_metadata->>'parent_category_hint',''),NFD)),U&'[\0300-\036f]','','g')
 ~ '(mouvements? internes?|comptes? a comptes?|transferts? internes?|virement (depuis|vers) (boursobank|boursorama|livret|epargne|compte courant))';
$$;
revoke all on function public.is_internal_bank_transfer(text,jsonb) from public,anon;
grant execute on function public.is_internal_bank_transfer(text,jsonb) to authenticated,service_role;

create function public.reconcile_internal_bank_transfers(p_household_id uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 if current_user not in('postgres','service_role') and (auth.uid() is null or not exists(select 1 from public.household_members m where m.household_id=p_household_id and m.user_id=auth.uid())) then raise exception 'Accès au foyer requis.' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_household_id::text,1));
 with candidates as (
  select outgoing.id as debit_id,incoming.id as credit_id,
   count(*) over(partition by outgoing.id) as debit_matches,count(*) over(partition by incoming.id) as credit_matches
  from public.entries outgoing
  join public.bank_transactions debit on debit.id=outgoing.bank_transaction_id and debit.household_id=outgoing.household_id
  join public.bank_accounts source on source.id=debit.bank_account_id
  join public.bank_transactions credit on credit.household_id=debit.household_id and credit.transaction_date=debit.transaction_date and credit.amount_cents=-debit.amount_cents and credit.currency=debit.currency and credit.bank_account_id<>debit.bank_account_id
  join public.bank_accounts destination on destination.id=credit.bank_account_id and destination.owner_user_id=source.owner_user_id
  join public.entries incoming on incoming.bank_transaction_id=credit.id and incoming.household_id=credit.household_id
  where outgoing.household_id=p_household_id and outgoing.kind='expense' and incoming.kind='income'
   and debit.amount_cents<0 and outgoing.amount_cents=abs(debit.amount_cents) and incoming.amount_cents=credit.amount_cents
   and outgoing.entry_date=debit.transaction_date and incoming.entry_date=credit.transaction_date
   and outgoing.flow_type in('standard','review','savings','transfer') and incoming.flow_type in('standard','review','savings','transfer')
   and public.is_internal_bank_transfer(debit.label,debit.source_metadata) and public.is_internal_bank_transfer(credit.label,credit.source_metadata)
 ), matched as(select debit_id,credit_id from candidates where debit_matches=1 and credit_matches=1), ids as(select debit_id id from matched union select credit_id from matched)
 update public.entries e set flow_type='transfer',income_allocation='calendar',expense_type=null
 where e.id in(select id from ids) and (e.flow_type<>'transfer' or e.income_allocation<>'calendar' or e.expense_type is not null);
 get diagnostics changed=row_count;return changed;
end;
$$;
revoke all on function public.reconcile_internal_bank_transfers(uuid) from public,anon;
grant execute on function public.reconcile_internal_bank_transfers(uuid) to authenticated,service_role;

create function public.reconcile_imported_transfer_statement()
returns trigger language plpgsql security invoker set search_path='' as $$
declare home uuid;
begin
 if pg_catalog.pg_trigger_depth()>1 then return null;end if;
 for home in select distinct household_id from transfer_new_rows where bank_transaction_id is not null loop
  perform public.reconcile_internal_bank_transfers(home);
 end loop;return null;
end;
$$;
revoke all on function public.reconcile_imported_transfer_statement() from public,anon;
create trigger reconcile_transfers_after_insert after insert on public.entries referencing new table as transfer_new_rows for each statement execute function public.reconcile_imported_transfer_statement();
create trigger reconcile_transfers_after_update after update on public.entries referencing new table as transfer_new_rows for each statement execute function public.reconcile_imported_transfer_statement();
