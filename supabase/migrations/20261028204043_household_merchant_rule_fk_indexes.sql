create index household_merchant_rules_category_scope_idx
  on public.household_merchant_rules(category_id, household_id, kind);

create index household_merchant_rules_subcategory_scope_idx
  on public.household_merchant_rules(subcategory_id, category_id, household_id, kind);

create index household_merchant_rules_created_by_idx
  on public.household_merchant_rules(created_by);
