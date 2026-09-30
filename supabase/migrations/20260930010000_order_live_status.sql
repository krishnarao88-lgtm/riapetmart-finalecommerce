-- Live courier and refund state on each order, kept in sync by the EasyParcel webhook/status check and the
-- Stripe webhook, so Admin → Orders shows what actually happened (cancelled shipment, delivered, refunded).
alter table public.orders
  add column easyparcel_status_code smallint,
  add column easyparcel_status text,
  add column easyparcel_status_at timestamptz,
  add column refunded_amount numeric(10, 2) not null default 0;
