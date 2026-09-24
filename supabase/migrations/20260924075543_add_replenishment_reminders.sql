alter table public.orders
  add column replenish_reminded_at timestamptz;

-- ponytail: fixed 30-day reorder window for all consumables, not per-SKU consumption
-- modeling. Tune this (or make it per-category) once real reorder-cadence data exists.
create or replace function public.get_orders_to_replenish()
returns table(order_id uuid, email text, items jsonb, subtotal numeric)
language sql
security definer
set search_path = public
as $$
  select id, customer_email, items, subtotal
  from public.orders
  where status = 'paid'
    and customer_email is not null
    and replenish_reminded_at is null
    and created_at < now() - interval '30 days'
    and created_at > now() - interval '37 days';
$$;

revoke all on function public.get_orders_to_replenish() from public;
grant execute on function public.get_orders_to_replenish() to anon, authenticated;

create or replace function public.mark_order_replenished(p_order_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders set replenish_reminded_at = now() where id = p_order_id;
$$;

revoke all on function public.mark_order_replenished(uuid) from public;
grant execute on function public.mark_order_replenished(uuid) to anon, authenticated;
