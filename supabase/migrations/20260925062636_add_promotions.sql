-- Scheduled sales (Malaysian festivals, 11.11 …). Dates are Malaysia-time calendar days, inclusive.
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  discount numeric(4, 3) not null check (discount > 0 and discount <= 0.5),
  scope text not null default 'house' check (scope in ('all', 'house', 'brand', 'category')),
  brand_id uuid references public.brands (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  banner text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (scope <> 'brand' or brand_id is not null),
  check (scope <> 'category' or category_id is not null)
);
alter table public.promotions enable row level security;
create policy "active promotions are public" on public.promotions for select using (is_active or (select private.is_admin()));
create policy "admin writes" on public.promotions for all
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Holiday calendar, 10% off own brands (Aniamor, Robust, Phyto). Raya dates follow moon sighting: re-check each year.
insert into public.promotions (name, starts_on, ends_on, discount, scope, banner) values
  ('Deepavali Sale', '2026-11-04', '2026-11-09', 0.10, 'house', 'Happy Deepavali! 10% off Aniamor, Robust & Phyto care'),
  ('11.11 Sale', '2026-11-11', '2026-11-11', 0.10, 'house', '11.11 is here: 10% off our own-brand pet care today only'),
  ('12.12 Sale', '2026-12-12', '2026-12-12', 0.10, 'house', '12.12 Sale: 10% off our own-brand pet care today only'),
  ('Christmas Sale', '2026-12-20', '2026-12-26', 0.10, 'house', 'Merry Christmas! 10% off Aniamor, Robust & Phyto care'),
  ('CNY Sale', '2027-02-01', '2027-02-08', 0.10, 'house', 'Gong Xi Fa Cai! 10% off Aniamor, Robust & Phyto care'),
  ('Raya Sale', '2027-03-03', '2027-03-13', 0.10, 'house', 'Selamat Hari Raya! 10% off Aniamor, Robust & Phyto care'),
  ('Raya Haji Sale', '2027-05-14', '2027-05-18', 0.10, 'house', 'Selamat Hari Raya Aidiladha! 10% off our own-brand care'),
  ('Merdeka Sale', '2027-08-28', '2027-08-31', 0.10, 'house', 'Selamat Hari Merdeka! 10% off Aniamor, Robust & Phyto care'),
  ('Malaysia Day Sale', '2027-09-14', '2027-09-16', 0.10, 'house', 'Happy Malaysia Day! 10% off our own-brand pet care'),
  ('Deepavali Sale 2027', '2027-10-25', '2027-10-30', 0.10, 'house', 'Happy Deepavali! 10% off Aniamor, Robust & Phyto care');
