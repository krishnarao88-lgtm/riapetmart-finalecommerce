-- Stage 1 foundation: catalogue, admin roles, settings, storage.
-- Cost prices live only in admin-only tables; the storefront never reads them.

create extension if not exists citext;

-- ---------- roles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Emails listed here become admins when they first sign in. No policies = service role only.
create table public.admin_allowlist (
  email citext primary key
);

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when exists (select 1 from public.admin_allowlist a where a.email = new.email)
         then 'admin' else 'customer' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- catalogue ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand_id uuid references public.brands (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  pet_type text not null check (pet_type in ('dog', 'cat', 'small_pet', 'dog_cat')),
  description text,
  ingredients text,
  usage text,
  is_regulated boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_brand_id_idx on public.products (brand_id);
create index products_category_id_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null,
  alt text not null default '',
  sort int not null default 0
);
create index product_images_product_id_idx on public.product_images (product_id);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  title text not null,
  unit_multiplier int not null default 1 check (unit_multiplier > 0),
  price numeric(10, 2) not null check (price >= 0),
  barcode text,
  weight_grams int check (weight_grams > 0),
  length_mm int check (length_mm > 0),
  width_mm int check (width_mm > 0),
  height_mm int check (height_mm > 0),
  is_active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index variants_product_id_idx on public.variants (product_id);
create trigger variants_touch before update on public.variants
  for each row execute function public.touch_updated_at();

-- Admin-only: cost and target margin (margin = share of selling price).
create table public.variant_costs (
  variant_id uuid primary key references public.variants (id) on delete cascade,
  cost_price numeric(10, 2) not null check (cost_price >= 0),
  margin numeric(4, 3) check (margin >= 0 and margin < 0.95),
  updated_at timestamptz not null default now()
);
create trigger variant_costs_touch before update on public.variant_costs
  for each row execute function public.touch_updated_at();

-- Admin-only: stock per batch with its expiry date.
create table public.stock_batches (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.variants (id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0),
  expiry_date date,
  batch_no text,
  received_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index stock_batches_variant_id_idx on public.stock_batches (variant_id);

-- Storefront view of stock: quantity and nearest expiry of unexpired batches, published products only.
create function public.variant_stock(p_variant_ids uuid[])
returns table (variant_id uuid, available int, nearest_expiry date)
language sql stable security definer set search_path = ''
as $$
  select v.id,
         coalesce(sum(b.quantity) filter (where b.quantity > 0), 0)::int,
         min(b.expiry_date) filter (where b.quantity > 0)
  from public.variants v
  join public.products p on p.id = v.product_id and p.status = 'published'
  left join public.stock_batches b
    on b.variant_id = v.id and (b.expiry_date is null or b.expiry_date >= current_date)
  where v.id = any (p_variant_ids) and v.is_active
  group by v.id;
$$;

-- ---------- settings (public, non-secret only) ----------
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('expiry_badges', '{"fresh_min_days": 181, "short_dated": [{"max_days": 90, "discount": 0.15}]}'),
  ('delivery', '{"same_day_states": ["Selangor", "Kuala Lumpur", "Putrajaya"], "lalamove_enabled": true, "easyparcel_enabled": true, "pickup_enabled": true, "free_delivery_min": null}'),
  ('pricing', '{"round_up_to": 0.10, "default_margin": 0.25}');

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.variants enable row level security;
alter table public.variant_costs enable row level security;
alter table public.stock_batches enable row level security;
alter table public.settings enable row level security;

create policy "own profile or admin" on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_admin()));
create policy "admin updates profiles" on public.profiles
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public read" on public.categories for select using (true);
create policy "admin insert" on public.categories for insert with check ((select public.is_admin()));
create policy "admin update" on public.categories for update using ((select public.is_admin()));
create policy "admin delete" on public.categories for delete using ((select public.is_admin()));

create policy "public read" on public.brands for select using (true);
create policy "admin insert" on public.brands for insert with check ((select public.is_admin()));
create policy "admin update" on public.brands for update using ((select public.is_admin()));
create policy "admin delete" on public.brands for delete using ((select public.is_admin()));

create policy "published or admin" on public.products
  for select using (status = 'published' or (select public.is_admin()));
create policy "admin insert" on public.products for insert with check ((select public.is_admin()));
create policy "admin update" on public.products for update using ((select public.is_admin()));
create policy "admin delete" on public.products for delete using ((select public.is_admin()));

create policy "published or admin" on public.product_images
  for select using (
    (select public.is_admin())
    or exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
  );
create policy "admin insert" on public.product_images for insert with check ((select public.is_admin()));
create policy "admin update" on public.product_images for update using ((select public.is_admin()));
create policy "admin delete" on public.product_images for delete using ((select public.is_admin()));

create policy "published or admin" on public.variants
  for select using (
    (select public.is_admin())
    or (is_active and exists (select 1 from public.products p where p.id = product_id and p.status = 'published'))
  );
create policy "admin insert" on public.variants for insert with check ((select public.is_admin()));
create policy "admin update" on public.variants for update using ((select public.is_admin()));
create policy "admin delete" on public.variants for delete using ((select public.is_admin()));

create policy "admin only" on public.variant_costs for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin only" on public.stock_batches for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public read" on public.settings for select using (true);
create policy "admin insert" on public.settings for insert with check ((select public.is_admin()));
create policy "admin update" on public.settings for update using ((select public.is_admin()));

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.variant_stock(uuid[]) to anon, authenticated;

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

create policy "admin uploads product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admin updates product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admin deletes product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
