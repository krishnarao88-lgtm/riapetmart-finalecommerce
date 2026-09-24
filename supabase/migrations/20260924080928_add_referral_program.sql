create table public.referral_codes (
  code text primary key,
  owner_email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

create policy "customer reads own referral code" on public.referral_codes
  for select to authenticated
  using ((auth.jwt() ->> 'email') = owner_email);

create or replace function public.get_or_create_referral_code(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_base text;
begin
  select code into v_code from public.referral_codes where owner_email = p_email;
  if v_code is not null then
    return v_code;
  end if;

  v_base := lower(regexp_replace(split_part(p_email, '@', 1), '[^a-z0-9]', '', 'g'));
  if v_base = '' then v_base := 'friend'; end if;
  v_code := v_base || '-' || substr(md5(random()::text), 1, 4);

  insert into public.referral_codes (code, owner_email) values (v_code, p_email)
  on conflict (owner_email) do update set owner_email = excluded.owner_email
  returning code into v_code;

  return v_code;
end;
$$;

revoke all on function public.get_or_create_referral_code(text) from public;
grant execute on function public.get_or_create_referral_code(text) to authenticated;

alter table public.orders
  add column referral_code text,
  add column referral_rewarded boolean not null default false;

create or replace function public.get_referral_reward_target(p_order_id uuid)
returns table(owner_email text)
language sql
security definer
set search_path = public
as $$
  select rc.owner_email
  from public.orders o
  join public.referral_codes rc on rc.code = o.referral_code
  where o.id = p_order_id and o.referral_rewarded = false and o.referral_code is not null;
$$;

revoke all on function public.get_referral_reward_target(uuid) from public;
grant execute on function public.get_referral_reward_target(uuid) to anon, authenticated;

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
