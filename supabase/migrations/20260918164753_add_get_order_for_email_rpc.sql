create or replace function public.get_order_for_email(p_session_id text)
returns table (items jsonb, subtotal numeric, shipping_method text, shipping_cost numeric)
language sql security definer set search_path = public as $$
  select items, subtotal, shipping_method, shipping_cost
  from public.orders
  where stripe_session_id = p_session_id;
$$;
revoke all on function public.get_order_for_email(text) from public;
grant execute on function public.get_order_for_email(text) to anon, authenticated;
