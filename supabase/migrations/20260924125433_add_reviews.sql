create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  customer_name text not null,
  customer_email text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "public reads approved reviews" on public.reviews
  for select using (status = 'approved');

create policy "admin reads all reviews" on public.reviews
  for select using ((select private.is_admin()));

create policy "admin updates reviews" on public.reviews
  for update using ((select private.is_admin())) with check ((select private.is_admin()));

create function public.submit_review(
  p_order_id uuid, p_customer_name text, p_customer_email text, p_rating smallint, p_body text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.reviews (order_id, customer_name, customer_email, rating, body)
  values (p_order_id, trim(p_customer_name), lower(trim(p_customer_email)), p_rating, trim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.submit_review to anon, authenticated;

alter table public.orders add column review_requested_at timestamptz;

create function public.get_orders_to_request_review()
returns table (order_id uuid, email text)
language sql security definer set search_path = public as $$
  select id, customer_email
  from public.orders
  where status = 'paid'
    and customer_email is not null
    and review_requested_at is null
    and created_at < now() - interval '5 days'
    and created_at > now() - interval '12 days'
$$;

grant execute on function public.get_orders_to_request_review to service_role;

create function public.mark_review_requested(p_order_id uuid)
returns void
language sql security definer set search_path = public as $$
  update public.orders set review_requested_at = now() where id = p_order_id
$$;

grant execute on function public.mark_review_requested to service_role;
