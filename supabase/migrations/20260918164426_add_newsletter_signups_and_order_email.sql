create table public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table public.newsletter_signups enable row level security;
create policy "admin only" on public.newsletter_signups for all
  using (private.is_admin());

create or replace function public.add_newsletter_signup(p_email text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.newsletter_signups (email) values (lower(trim(p_email)))
  on conflict (email) do nothing;
end;
$$;
revoke all on function public.add_newsletter_signup(text) from public;
grant execute on function public.add_newsletter_signup(text) to anon, authenticated;

create or replace function public.mark_order_paid(p_session_id text, p_payment_intent text, p_customer_email text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders
  set status = 'paid', stripe_payment_intent = p_payment_intent,
      customer_email = coalesce(p_customer_email, customer_email)
  where stripe_session_id = p_session_id and status = 'pending';
end;
$$;
revoke all on function public.mark_order_paid(text, text, text) from public;
grant execute on function public.mark_order_paid(text, text, text) to anon, authenticated;
drop function if exists public.mark_order_paid(text, text);
