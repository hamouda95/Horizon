-- Visitors who are not signed in (anon) never need these tables: no policy grants them any row, but the
-- default Supabase grants left them privileges such as TRUNCATE, which row-level security does not cover.
revoke all on table
 public.bank_transactions,
 public.category_budget_rules,
 public.financial_entry_history,
 public.household_documents,
 public.household_loans,
 public.household_obligations,
 public.household_savings_goals,
 public.monthly_category_budgets,
 public.savings_movements
from anon;
revoke all on public.financial_accounts from anon;
