-- Real product-page views, for an honest "N people viewed this in the last 24 hours" line.
create table public.product_views (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index product_views_recent_idx on public.product_views (product_id, viewed_at desc);
alter table public.product_views enable row level security; -- no policies: only the functions below touch it

create function public.record_product_view(p_product_id uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.product_views (product_id)
  select id from public.products where id = p_product_id and status = 'published';
$$;

create function public.product_view_count(p_product_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.product_views
  where product_id = p_product_id and viewed_at > now() - interval '24 hours';
$$;

revoke execute on function public.record_product_view(uuid) from public;
revoke execute on function public.product_view_count(uuid) from public;
grant execute on function public.record_product_view(uuid) to anon, authenticated, service_role;
grant execute on function public.product_view_count(uuid) to anon, authenticated, service_role;
