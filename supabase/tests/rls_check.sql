-- Access-rule check. Run in the Supabase SQL editor (or via MCP execute_sql); it rolls back, so nothing is saved.
-- Every *_ok column must be true.
begin;
insert into public.products (id, slug, name, pet_type, status) values
  ('00000000-0000-4000-8000-000000000001', 'rls-test-published', 'RLS test published', 'cat', 'published'),
  ('00000000-0000-4000-8000-000000000002', 'rls-test-draft', 'RLS test draft', 'cat', 'draft');
insert into public.variants (id, product_id, sku, title, price) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'RLS-A', 'Single', 2.80),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000002', 'RLS-B', 'Single', 2.80);
insert into public.variant_costs (variant_id, cost_price, margin) values
  ('00000000-0000-4000-8000-0000000000a1', 2.00, 0.285);
insert into public.stock_batches (variant_id, quantity, expiry_date) values
  ('00000000-0000-4000-8000-0000000000a1', 5, current_date + 60),
  ('00000000-0000-4000-8000-0000000000a1', 3, current_date - 1); -- expired: must not count

set local role anon;
select
  (select count(*) from public.products where slug like 'rls-test-%') = 1 as drafts_hidden_ok,
  (select count(*) from public.variants where sku like 'RLS-%') = 1 as draft_variants_hidden_ok,
  (select count(*) from public.variant_costs) = 0 as costs_hidden_ok,
  (select count(*) from public.stock_batches) = 0 as batches_hidden_ok,
  (select count(*) from public.admin_allowlist) = 0 as allowlist_hidden_ok,
  (select available from public.variant_stock(array['00000000-0000-4000-8000-0000000000a1']::uuid[])) = 5 as expired_stock_excluded_ok,
  (select count(*) from public.variant_stock(array['00000000-0000-4000-8000-0000000000a2']::uuid[])) = 0 as draft_stock_hidden_ok;
rollback;
