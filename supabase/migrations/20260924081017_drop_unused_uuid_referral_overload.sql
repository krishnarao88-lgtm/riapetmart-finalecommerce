drop function if exists public.get_referral_reward_target(uuid);
drop function if exists public.mark_referral_rewarded(uuid);

create or replace function public.mark_referral_rewarded(p_order_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders set referral_rewarded = true where id = p_order_id;
$$;

revoke all on function public.mark_referral_rewarded(uuid) from public;
grant execute on function public.mark_referral_rewarded(uuid) to anon, authenticated;
