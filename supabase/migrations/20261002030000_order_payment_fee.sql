-- Stripe's actual processing fee for the order (from the charge's balance transaction), for per-order profit.
-- Null until fetched; Finance falls back to the 3% + RM1 estimate.
alter table public.orders add column if not exists payment_fee numeric(10, 2);
