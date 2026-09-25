-- Own-brand bundle discounts need the owner's approval, per product, before checkout applies them.
create table public.bundle_offers (
  product_id uuid primary key references public.products (id) on delete cascade,
  discount numeric(4, 3) not null default 0.10 check (discount > 0 and discount <= 0.5),
  approved boolean not null default false,
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.bundle_offers enable row level security;
create policy "approved offers are public" on public.bundle_offers for select using (approved or (select private.is_admin()));
create policy "admin writes" on public.bundle_offers for all
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Every own-brand product starts with a pending 10% offer for the owner to review.
insert into public.bundle_offers (product_id)
select p.id from public.products p join public.brands b on b.id = p.brand_id where b.is_house_brand
on conflict do nothing;

-- Holiday sales wait for approval too (is_active = approved).
update public.promotions set is_active = false;
