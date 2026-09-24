alter table public.orders
  add column shipping_service_id text,
  add column easyparcel_order_number text,
  add column easyparcel_awb_number text,
  add column easyparcel_awb_url text,
  add column easyparcel_tracking_url text;

drop function if exists public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb);

create or replace function public.create_pending_order(
  p_session_id text,
  p_items jsonb,
  p_subtotal numeric,
  p_customer_email text default null,
  p_shipping_method text default null,
  p_shipping_cost numeric default 0,
  p_shipping_address jsonb default null,
  p_shipping_service_id text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.orders (
    stripe_session_id, items, subtotal, customer_email,
    shipping_method, shipping_cost, shipping_address, shipping_service_id, status
  )
  values (
    p_session_id, p_items, p_subtotal, p_customer_email,
    p_shipping_method, p_shipping_cost, p_shipping_address, p_shipping_service_id, 'pending'
  );
$$;

revoke all on function public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb, text) from public;
grant execute on function public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb, text) to anon, authenticated;

create or replace function public.save_easyparcel_booking(
  p_order_id uuid,
  p_order_number text,
  p_awb_number text,
  p_awb_url text,
  p_tracking_url text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
  set easyparcel_order_number = p_order_number,
      easyparcel_awb_number = p_awb_number,
      easyparcel_awb_url = p_awb_url,
      easyparcel_tracking_url = p_tracking_url
  where id = p_order_id;
$$;

revoke all on function public.save_easyparcel_booking(uuid, text, text, text, text) from public;
grant execute on function public.save_easyparcel_booking(uuid, text, text, text, text) to authenticated;
