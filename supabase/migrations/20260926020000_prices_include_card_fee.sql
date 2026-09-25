-- Owner-approved (2026-09-26): build the 3% card fee into every selling price. Never lowers a price.
-- Old prices are kept in private.price_backup_20260925 so this can be reversed.
create table if not exists private.price_backup_20260925 as
  select id as variant_id, price, now() as backed_up_at from public.variants;

update public.variants v set price = greatest(
    ceil(round(v.price / 0.97 / 0.1, 6)) * 0.1,
    coalesce(case when c.margin is not null and c.cost_price > 0
      then ceil(round(c.cost_price / (1 - c.margin - 0.03) / 0.1, 6)) * 0.1 end, 0))
from public.variants v2 left join public.variant_costs c on c.variant_id = v2.id
where v2.id = v.id and v.price > 0;
