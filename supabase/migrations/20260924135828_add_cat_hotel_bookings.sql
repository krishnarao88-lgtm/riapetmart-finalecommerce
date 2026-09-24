create table public.cat_hotel_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  cat_name text,
  check_in date not null,
  check_out date not null check (check_out > check_in),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.cat_hotel_bookings enable row level security;

create policy "admin manages cat hotel bookings" on public.cat_hotel_bookings
  for all using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "staff views cat hotel bookings" on public.cat_hotel_bookings
  for select using ((select private.is_staff()));

create policy "staff updates cat hotel bookings" on public.cat_hotel_bookings
  for update using ((select private.is_staff())) with check ((select private.is_staff()));

create function public.submit_cat_hotel_booking(
  p_customer_name text, p_customer_email text, p_customer_phone text,
  p_cat_name text, p_check_in date, p_check_out date, p_notes text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_check_out <= p_check_in then
    raise exception 'Check-out must be after check-in';
  end if;
  insert into public.cat_hotel_bookings (customer_name, customer_email, customer_phone, cat_name, check_in, check_out, notes)
  values (trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone), nullif(trim(p_cat_name), ''), p_check_in, p_check_out, nullif(trim(p_notes), ''))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.submit_cat_hotel_booking to anon, authenticated;
