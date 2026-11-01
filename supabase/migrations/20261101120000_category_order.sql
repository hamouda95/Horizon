-- Household-chosen order of categories and subcategories (null = ordered by importance in the app).
alter table public.categories add column if not exists sort_order integer;
alter table public.subcategories add column if not exists sort_order integer;
alter table public.categories drop constraint if exists categories_sort_order_range;
alter table public.categories add constraint categories_sort_order_range check(sort_order is null or sort_order between 0 and 1000000);
alter table public.subcategories drop constraint if exists subcategories_sort_order_range;
alter table public.subcategories add constraint subcategories_sort_order_range check(sort_order is null or sort_order between 0 and 1000000);
