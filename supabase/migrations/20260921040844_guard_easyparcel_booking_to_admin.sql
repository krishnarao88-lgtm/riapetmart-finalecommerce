create or replace function public.save_easyparcel_booking(
  p_order_id uuid,
  p_order_number text,
  p_awb_number text,
  p_awb_url text,
  p_tracking_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'admin only';
  end if;
  update public.orders
  set easyparcel_order_number = p_order_number,
      easyparcel_awb_number = p_awb_number,
      easyparcel_awb_url = p_awb_url,
      easyparcel_tracking_url = p_tracking_url
  where id = p_order_id;
end;
$$;
