-- Server-only OAuth token storage for carrier integrations (EasyParcel).
-- No RLS policies at all: this table is readable/writable only via the
-- Supabase service-role key (used exclusively by trusted server routes,
-- never shipped to the browser), because these are live bearer tokens
-- that must never be reachable through the public anon key.
create table public.integration_tokens (
  provider text primary key,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.integration_tokens enable row level security;

alter table public.orders
  add column shipping_method text,
  add column shipping_cost numeric(10,2) not null default 0,
  add column shipping_address jsonb;

create or replace function public.create_pending_order(
  p_session_id text, p_items jsonb, p_subtotal numeric, p_customer_email text,
  p_shipping_method text default null, p_shipping_cost numeric default 0, p_shipping_address jsonb default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.orders (stripe_session_id, items, subtotal, customer_email, shipping_method, shipping_cost, shipping_address)
  values (p_session_id, p_items, p_subtotal, p_customer_email, p_shipping_method, p_shipping_cost, p_shipping_address)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb) from public;
grant execute on function public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb) to anon, authenticated;
