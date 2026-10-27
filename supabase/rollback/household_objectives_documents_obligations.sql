drop policy if exists household_documents_storage_select on storage.objects;
drop policy if exists household_documents_storage_insert on storage.objects;
drop policy if exists household_documents_storage_delete on storage.objects;
drop policy if exists household_documents_select_members on public.household_documents;
drop policy if exists household_documents_insert_members on public.household_documents;
drop policy if exists household_documents_delete_members on public.household_documents;
drop policy if exists household_obligations_members on public.household_obligations;
drop policy if exists household_savings_goals_members on public.household_savings_goals;

alter publication supabase_realtime drop table if exists public.household_documents;
alter publication supabase_realtime drop table if exists public.household_obligations;
alter publication supabase_realtime drop table if exists public.household_savings_goals;
delete from storage.buckets where id='household_documents';

drop table if exists public.household_documents;
drop table if exists public.household_obligations;
drop policy if exists savings_movements_household_members on public.savings_movements;
alter table public.savings_movements drop column if exists goal_id;
drop table if exists public.household_savings_goals;
create policy savings_movements_household_members on public.savings_movements
 for all to authenticated
 using (exists(select 1 from public.household_members m where m.household_id=savings_movements.household_id and m.user_id=(select auth.uid())))
 with check (exists(select 1 from public.household_members m where m.household_id=savings_movements.household_id and m.user_id=(select auth.uid())));
