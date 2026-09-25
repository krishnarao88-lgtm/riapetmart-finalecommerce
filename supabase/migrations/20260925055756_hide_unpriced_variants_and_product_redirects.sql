-- Sizes with no price yet (RM0) stay hidden from shoppers and checkout until the owner prices them.
drop policy "published or admin" on public.variants;
create policy "published or admin" on public.variants for select using (
  (select private.is_admin())
  or (is_active and price > 0 and exists (
    select 1 from public.products p where p.id = variants.product_id and p.status = 'published'))
);

-- Old product addresses keep working after products are merged or renamed.
create table public.product_redirects (
  old_slug text primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.product_redirects enable row level security;
create policy "anyone can read" on public.product_redirects for select using (true);
create policy "admin writes" on public.product_redirects for all
  using ((select private.is_admin())) with check ((select private.is_admin()));
create index product_redirects_product_id_idx on public.product_redirects (product_id);
