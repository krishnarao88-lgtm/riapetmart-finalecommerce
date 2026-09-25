alter table public.orders
  add column lalamove_order_id text unique,
  add column lalamove_status text,
  add column lalamove_share_link text;
