-- What the courier actually charged us for this order (Lalamove/EasyParcel at booking), for per-order profit.
-- Null until a courier is booked; store pickup costs nothing.
alter table public.orders add column if not exists courier_cost numeric(10, 2);
