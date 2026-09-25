-- The shop's own brands: suggested alongside related products and eligible for the bundle discount.
alter table public.brands add column is_house_brand boolean not null default false;
update public.brands set is_house_brand = true where slug in ('aniamor', 'robust', 'phyto-specialities');
