-- Applied via MCP as admin_reads_product_views.
create policy "admin reads product views" on public.product_views for select using ((select private.is_admin()));
