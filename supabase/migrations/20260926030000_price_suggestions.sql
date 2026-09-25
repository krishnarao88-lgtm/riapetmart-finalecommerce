-- Market-checked price suggestions (from the pricing agent); nothing changes a price until an admin approves.
create table public.price_suggestions (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.variants(id) on delete cascade,
  current_price numeric not null,
  suggested_price numeric not null check (suggested_price > 0),
  market_low numeric,
  market_high numeric,
  sources jsonb not null default '[]'::jsonb, -- [{ "name": "Shop", "url": "https://…", "price": 12.9 }]
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index price_suggestions_pending on public.price_suggestions (variant_id) where status = 'pending';
alter table public.price_suggestions enable row level security;
create policy "admin only" on public.price_suggestions for all
  using ((select private.is_admin())) with check ((select private.is_admin()));
