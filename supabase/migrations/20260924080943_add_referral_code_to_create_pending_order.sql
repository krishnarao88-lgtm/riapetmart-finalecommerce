drop function if exists public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb, text);

create or replace function public.create_pending_order(
  p_session_id text,
  p_items jsonb,
  p_subtotal numeric,
  p_customer_email text default null,
  p_shipping_method text default null,
  p_shipping_cost numeric default 0,
  p_shipping_address jsonb default null,
  p_shipping_service_id text default null,
  p_referral_code text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.orders (
    stripe_session_id, items, subtotal, customer_email,
    shipping_method, shipping_cost, shipping_address, shipping_service_id, referral_code, status
  )
  values (
    p_session_id, p_items, p_subtotal, p_customer_email,
    p_shipping_method, p_shipping_cost, p_shipping_address, p_shipping_service_id, p_referral_code, 'pending'
  );
$$;

revoke all on function public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb, text, text) from public;
grant execute on function public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb, text, text) to anon, authenticated;
