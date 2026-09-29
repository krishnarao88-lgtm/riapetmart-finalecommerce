-- "Remind me on WhatsApp before it runs out": a shopper leaves name + number on a product page; on the day,
-- the daily cron sends the owner a Telegram message with a ready-to-send WhatsApp link. Service role only.
create table public.refill_reminders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 1 and 60),
  phone text not null check (phone ~ '^60[0-9]{8,11}$'),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text not null,
  remind_on date not null,
  sent_at timestamptz
);
create index refill_reminders_due on public.refill_reminders (remind_on) where sent_at is null;
alter table public.refill_reminders enable row level security;
