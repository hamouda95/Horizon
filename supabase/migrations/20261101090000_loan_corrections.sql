-- Loans become correctable: expected repayment date, opening amount and date while consistent with linked
-- operations, and deletion. Linked operations stay protected by check_loan_balance and validate_entry_finance_links.

alter table public.household_loans add column if not exists expected_repayment_on date;
alter table public.household_loans drop constraint if exists household_loans_expected_after_opening;
alter table public.household_loans add constraint household_loans_expected_after_opening
 check(expected_repayment_on is null or opened_on is null or expected_repayment_on>=opened_on);

-- Was: opening amount and date immutable. Now: changeable as long as the history stays coherent.
create or replace function public.protect_loan_opening() returns trigger language plpgsql security invoker set search_path='' as $$
declare first_operation date;
begin
 if new.household_id is distinct from old.household_id then raise exception 'A loan cannot move to another household' using errcode='23514';end if;
 if (new.opening_principal_cents,new.opened_on) is distinct from (old.opening_principal_cents,old.opened_on) then
  select min(e.entry_date) into first_operation from public.entries e where e.loan_id=new.id;
  if new.opened_on is not null and first_operation is not null and new.opened_on>first_operation then
   raise exception 'The loan date must precede its first operation' using errcode='23514';
  end if;
  if exists(select 1 from (
    select new.opening_principal_cents+sum(sum(case when e.kind='expense' then e.amount_cents else -e.amount_cents end)) over(order by e.entry_date) running
    from public.entries e where e.loan_id=new.id group by e.entry_date) s where running<0) then
   raise exception 'Repayments cannot exceed the amount lent at that date' using errcode='23514';
  end if;
 end if;
 return new;
end;
$$;

-- Deletes a loan. Manual operations of the loan are deleted with it; imported ones are only detached and set
-- back to review, so they neither disappear from the bank history nor come back at the next import.
create or replace function public.delete_household_loan(p_household_id uuid,p_loan_id uuid,p_with_operations boolean default false)
returns integer language plpgsql security invoker set search_path='' as $$
declare linked integer;deleted integer:=0;detached integer:=0;
begin
 perform 1 from public.household_loans where id=p_loan_id and household_id=p_household_id for update;
 if not found then raise exception 'Loan not found or inaccessible' using errcode='42501';end if;
 select count(*) into linked from public.entries where loan_id=p_loan_id and household_id=p_household_id;
 if linked>0 and not p_with_operations then raise exception 'This loan has linked operations' using errcode='23514';end if;
 update public.entries set loan_id=null,flow_type='review',payment_method=null
  where loan_id=p_loan_id and household_id=p_household_id and bank_transaction_id is not null;
 get diagnostics detached=row_count;
 delete from public.entries where loan_id=p_loan_id and household_id=p_household_id and bank_transaction_id is null;
 get diagnostics deleted=row_count;
 if detached+deleted<>linked then raise exception 'Some linked operations could not be changed' using errcode='42501';end if;
 delete from public.household_loans where id=p_loan_id and household_id=p_household_id;
 return deleted;
end;
$$;
revoke all on function public.delete_household_loan(uuid,uuid,boolean) from public,anon;
grant execute on function public.delete_household_loan(uuid,uuid,boolean) to authenticated;
