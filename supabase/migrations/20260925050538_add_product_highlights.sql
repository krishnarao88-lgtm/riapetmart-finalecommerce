-- Short benefit tags shown as chips on product cards and pages (e.g. "Liver support", "Detox").
alter table public.products add column highlights text[] not null default '{}';
