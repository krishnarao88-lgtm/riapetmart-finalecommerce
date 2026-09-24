create table public.abandoned_carts (
  email text primary key,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  created_at timestamptz not null default now(),
  reminded_at timestamptz,
  recovered boolean not null default false
);

alter table public.abandoned_carts enable row level security;

create policy "admin read abandoned_carts" on public.abandoned_carts
  for select using (private.is_admin());

create or replace function public.save_abandoned_cart(p_email text, p_items jsonb, p_subtotal numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.abandoned_carts (email, items, subtotal, created_at, reminded_at, recovered)
  values (p_email, p_items, p_subtotal, now(), null, false)
  on conflict (email) do update
    set items = excluded.items,
        subtotal = excluded.subtotal,
        created_at = now(),
        reminded_at = null,
        recovered = false;
end;
$$;

revoke all on function public.save_abandoned_cart(text, jsonb, numeric) from public;
grant execute on function public.save_abandoned_cart(text, jsonb, numeric) to anon, authenticated;

create or replace function public.mark_cart_recovered(p_email text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.abandoned_carts set recovered = true where email = p_email;
$$;

revoke all on function public.mark_cart_recovered(text) from public;
grant execute on function public.mark_cart_recovered(text) to anon, authenticated;

create or replace function public.get_carts_to_remind()
returns table(email text, items jsonb, subtotal numeric)
language sql
security definer
set search_path = public
as $$
  select email, items, subtotal from public.abandoned_carts
  where recovered = false
    and reminded_at is null
    and created_at < now() - interval '1 hour'
    and created_at > now() - interval '48 hours';
$$;

revoke all on function public.get_carts_to_remind() from public;
grant execute on function public.get_carts_to_remind() to anon, authenticated;

create or replace function public.mark_cart_reminded(p_email text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.abandoned_carts set reminded_at = now() where email = p_email;
$$;

revoke all on function public.mark_cart_reminded(text) from public;
grant execute on function public.mark_cart_reminded(text) to anon, authenticated;
