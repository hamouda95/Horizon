-- Separate the household person who owns an account from the authenticated
-- user who imported it (owner_user_id remains the access-control identity).
alter table public.bank_accounts
  add column owner_person_id uuid references public.household_people(id) on delete set null;

create index bank_accounts_household_person_idx
  on public.bank_accounts(household_id, owner_person_id);


create function public.check_bank_account_owner_person()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_person_id is not null and not exists (
    select 1
    from public.household_people p
    where p.id = new.owner_person_id
      and p.household_id = new.household_id
  ) then
    raise exception 'Account owner must belong to the same household'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.check_bank_account_owner_person() from public, anon, authenticated;

create trigger bank_accounts_check_owner_person
  before insert or update of owner_person_id, household_id
  on public.bank_accounts
  for each row execute function public.check_bank_account_owner_person();
