-- Welcome series: email 1 (the code) goes at sign-up; emails 2 (day 3) and 3 (day 7) are sent by the noon cron.
alter table public.newsletter_signups
  add column if not exists welcome2_sent_at timestamptz,
  add column if not exists welcome3_sent_at timestamptz;
