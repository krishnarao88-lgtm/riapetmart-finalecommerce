-- Review requests: skip test orders, and catch up on orders up to 30 days old (the old 12-day window
-- dropped orders whenever the daily cron missed a run).
create or replace function public.get_orders_to_request_review()
 returns table(order_id uuid, email text)
 language sql
 security definer
 set search_path to 'public'
as $function$
  select id, customer_email
  from public.orders
  where status = 'paid'
    and not coalesce(is_test, false)
    and customer_email is not null
    and review_requested_at is null
    and created_at < now() - interval '5 days'
    and created_at > now() - interval '30 days'
$function$;
