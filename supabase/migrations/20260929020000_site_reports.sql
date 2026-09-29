-- Weekly "how to improve the website" reports. A Claude cloud routine writes a row every Monday morning;
-- /api/cron/weekly-report sends the newest unsent one to the owner's Telegram. Service role only.
create table public.site_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  body text not null check (length(body) between 1 and 3800),
  sent_at timestamptz
);
alter table public.site_reports enable row level security;
