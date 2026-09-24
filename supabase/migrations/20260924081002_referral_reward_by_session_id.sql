create or replace function public.get_referral_reward_target(p_session_id text)
returns table(order_id uuid, owner_email text)
language sql
security definer
set search_path = public
as $$
  select o.id, rc.owner_email
  from public.orders o
  join public.referral_codes rc on rc.code = o.referral_code
  where o.stripe_session_id = p_session_id and o.referral_rewarded = false and o.referral_code is not null;
$$;

revoke all on function public.get_referral_reward_target(text) from public;
grant execute on function public.get_referral_reward_target(text) to anon, authenticated;
