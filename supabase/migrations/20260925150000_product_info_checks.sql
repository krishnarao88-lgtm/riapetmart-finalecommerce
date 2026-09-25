create table public.product_info_checks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  field text not null check (field in ('description','ingredients','usage','highlights')),
  current_text text,
  proposed_text text,
  source_url text,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index product_info_checks_pending on public.product_info_checks (product_id) where status = 'pending';
alter table public.product_info_checks enable row level security;
create policy "admin only" on public.product_info_checks for all
  using ((select private.is_admin())) with check ((select private.is_admin()));

alter table public.products add column info_verified_at date, add column info_source text;
