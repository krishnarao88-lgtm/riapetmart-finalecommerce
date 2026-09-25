-- Products left out of a sale when approving it would push their margin under the floor
-- (or their cost is unknown). Filled in by the admin approval action.
alter table public.promotions add column excluded_product_ids uuid[] not null default '{}';
