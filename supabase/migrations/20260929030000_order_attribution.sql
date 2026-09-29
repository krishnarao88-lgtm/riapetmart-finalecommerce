-- Where each order came from (UTM tags, ad click ids, referring site) plus the Meta match fields
-- (_fbp/_fbc cookies, IP, browser) used once for the server-side Purchase report. Written at checkout.
alter table public.orders add column attribution jsonb;
