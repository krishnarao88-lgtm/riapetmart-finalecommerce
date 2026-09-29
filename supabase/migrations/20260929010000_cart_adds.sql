-- Anonymous add-to-cart counts per product (no customer details), for the owner's daily summary.
create table public.cart_adds (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index cart_adds_created_at on public.cart_adds (created_at);
alter table public.cart_adds enable row level security;
create policy "admin read" on public.cart_adds for select using ((select private.is_admin()));

create function public.record_cart_add(p_variant_id uuid)
returns void language sql security definer set search_path to '' as $$
  insert into public.cart_adds (product_id)
  select p.id from public.variants v join public.products p on p.id = v.product_id
  where v.id = p_variant_id and p.status = 'published';
$$;
grant execute on function public.record_cart_add(uuid) to anon, authenticated;
