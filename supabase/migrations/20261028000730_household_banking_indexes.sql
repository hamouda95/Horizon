create index if not exists bank_accounts_owner_user_idx on public.bank_accounts(owner_user_id);
create index if not exists bank_transactions_account_scope_idx on public.bank_transactions(bank_account_id,household_id);
create index if not exists entries_bank_transaction_scope_idx on public.entries(bank_transaction_id,household_id) where bank_transaction_id is not null;
create index if not exists household_savings_goals_household_idx on public.household_savings_goals(household_id);
create index if not exists household_obligations_category_idx on public.household_obligations(category_id);
create index if not exists household_documents_household_idx on public.household_documents(household_id);
create index if not exists household_documents_uploaded_by_idx on public.household_documents(uploaded_by);
