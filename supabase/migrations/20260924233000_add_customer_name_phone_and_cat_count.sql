alter table public.orders add column customer_name text;
alter table public.orders add column customer_phone text;

drop function public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb, text, text);

create function public.create_pending_order(
  p_session_id text, p_items jsonb, p_subtotal numeric, p_customer_email text default null,
  p_shipping_method text default null, p_shipping_cost numeric default 0, p_shipping_address jsonb default null,
  p_shipping_service_id text default null, p_referral_code text default null,
  p_customer_name text default null, p_customer_phone text default null
) returns void
language sql security definer set search_path = public as $$
  insert into public.orders (
    stripe_session_id, items, subtotal, customer_email,
    shipping_method, shipping_cost, shipping_address, shipping_service_id, referral_code,
    customer_name, customer_phone, status
  )
  values (
    p_session_id, p_items, p_subtotal, p_customer_email,
    p_shipping_method, p_shipping_cost, p_shipping_address, p_shipping_service_id, p_referral_code,
    p_customer_name, p_customer_phone, 'pending'
  );
$$;

drop function public.get_order_for_email(text);

create function public.get_order_for_email(p_session_id text)
returns table (id uuid, items jsonb, subtotal numeric, shipping_method text, shipping_cost numeric)
language sql security definer set search_path = public as $$
  select id, items, subtotal, shipping_method, shipping_cost
  from public.orders
  where stripe_session_id = p_session_id;
$$;

alter table public.cat_hotel_bookings add column pet_count integer not null default 1 check (pet_count >= 1);

drop function public.submit_cat_hotel_booking(text, text, text, text, date, date, text);

create function public.submit_cat_hotel_booking(
  p_customer_name text, p_customer_email text, p_customer_phone text,
  p_cat_name text, p_check_in date, p_check_out date, p_notes text, p_pet_count integer default 1
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_check_out <= p_check_in then
    raise exception 'Check-out must be after check-in';
  end if;
  insert into public.cat_hotel_bookings (customer_name, customer_email, customer_phone, cat_name, check_in, check_out, notes, pet_count)
  values (trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone), nullif(trim(p_cat_name), ''), p_check_in, p_check_out, nullif(trim(p_notes), ''), greatest(1, p_pet_count))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.submit_cat_hotel_booking to anon, authenticated;
