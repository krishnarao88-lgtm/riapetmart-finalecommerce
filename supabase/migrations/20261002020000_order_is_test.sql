-- Test orders stay in the table (Stripe/EasyParcel cross-reference) but are hidden from Admin, Finance, reports
-- and best-sellers. Owner (2 Oct 2026): only RPM2026-10 and RPM2026-11 are real; everything before is testing.
alter table public.orders add column if not exists is_test boolean not null default false;
