-- What a Stripe promo code (welcome / referral) took off the order, recorded when it's paid. Null on older orders.
alter table public.orders add column if not exists code_discount numeric;
