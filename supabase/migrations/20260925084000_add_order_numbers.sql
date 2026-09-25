-- Applied via MCP as add_order_numbers + order_number_in_get_order_for_email.
-- Human order numbers: RPM<year>-<seq>, e.g. RPM2026-01. Assigned only when an order is paid, so
-- abandoned checkouts don't leave gaps. The sequence restarts each year (Kuala Lumpur time).
create table private.order_counters (year int primary key, last int not null);

alter table public.orders add column order_number text unique;

create or replace function private.format_order_number(p_year int, p_seq int)
returns text language sql immutable as $$
  select 'RPM' || p_year || '-' || case when p_seq < 10 then '0' || p_seq else p_seq::text end;
$$;

create or replace function private.assign_order_number()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  v_year int := extract(year from now() at time zone 'Asia/Kuala_Lumpur');
  v_seq int;
begin
  if new.status = 'paid' and new.order_number is null then
    insert into private.order_counters as c (year, last) values (v_year, 1)
    on conflict (year) do update set last = c.last + 1
    returning last into v_seq;
    new.order_number := private.format_order_number(v_year, v_seq);
  end if;
  return new;
end;
$$;

create trigger orders_assign_number
before insert or update of status on public.orders
for each row execute function private.assign_order_number();

with numbered as (
  select id,
         extract(year from created_at at time zone 'Asia/Kuala_Lumpur')::int as y,
         row_number() over (partition by extract(year from created_at at time zone 'Asia/Kuala_Lumpur') order by created_at) as n
  from public.orders where status = 'paid'
)
update public.orders o set order_number = private.format_order_number(numbered.y, numbered.n::int)
from numbered where o.id = numbered.id;

insert into private.order_counters (year, last)
select extract(year from created_at at time zone 'Asia/Kuala_Lumpur')::int, count(*)
from public.orders where status = 'paid' group by 1;

drop function public.get_order_for_email(text);
create function public.get_order_for_email(p_session_id text)
returns table(id uuid, items jsonb, subtotal numeric, shipping_method text, shipping_cost numeric, order_number text)
language sql security definer set search_path to 'public' as $$
  select id, items, subtotal, shipping_method, shipping_cost, order_number
  from public.orders
  where stripe_session_id = p_session_id;
$$;
revoke all on function public.get_order_for_email(text) from public, anon, authenticated;
grant execute on function public.get_order_for_email(text) to service_role;
