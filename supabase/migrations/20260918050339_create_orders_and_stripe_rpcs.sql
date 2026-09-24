create table public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stripe_session_id text unique not null,
  stripe_payment_intent text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  customer_email text,
  currency text not null default 'myr',
  subtotal numeric(10,2) not null,
  items jsonb not null
);

alter table public.orders enable row level security;

create policy "admin only" on public.orders for all
  using (private.is_admin());

-- Anon has no direct table grants on orders; all writes route through these
-- security-definer functions so a webhook call (no user session) can still
-- record/confirm an order without needing the Supabase service-role key.
create or replace function public.create_pending_order(
  p_session_id text, p_items jsonb, p_subtotal numeric, p_customer_email text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.orders (stripe_session_id, items, subtotal, customer_email)
  values (p_session_id, p_items, p_subtotal, p_customer_email)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.mark_order_paid(p_session_id text, p_payment_intent text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders
  set status = 'paid', stripe_payment_intent = p_payment_intent
  where stripe_session_id = p_session_id and status = 'pending';
end;
$$;

revoke all on function public.create_pending_order(text, jsonb, numeric, text) from public;
revoke all on function public.mark_order_paid(text, text) from public;
grant execute on function public.create_pending_order(text, jsonb, numeric, text) to anon, authenticated;
grant execute on function public.mark_order_paid(text, text) to anon, authenticated;
