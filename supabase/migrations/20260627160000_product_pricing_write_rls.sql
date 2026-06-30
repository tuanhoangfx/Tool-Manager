-- Allow authenticated Data Box users to edit native pricing catalogs in UI.

drop policy if exists "product_pricing_insert_authenticated" on public.product_pricing;
create policy "product_pricing_insert_authenticated" on public.product_pricing
  for insert to authenticated
  with check (true);

drop policy if exists "product_pricing_update_authenticated" on public.product_pricing;
create policy "product_pricing_update_authenticated" on public.product_pricing
  for update to authenticated
  using (true)
  with check (true);

drop policy if exists "product_pricing_delete_authenticated" on public.product_pricing;
create policy "product_pricing_delete_authenticated" on public.product_pricing
  for delete to authenticated
  using (true);

drop policy if exists "pricing_catalogs_insert_authenticated" on public.pricing_catalogs;
create policy "pricing_catalogs_insert_authenticated" on public.pricing_catalogs
  for insert to authenticated
  with check (true);

drop policy if exists "pricing_catalogs_update_authenticated" on public.pricing_catalogs;
create policy "pricing_catalogs_update_authenticated" on public.pricing_catalogs
  for update to authenticated
  using (true)
  with check (true);

grant insert, update, delete on public.product_pricing to authenticated;
grant insert, update on public.pricing_catalogs to authenticated;
