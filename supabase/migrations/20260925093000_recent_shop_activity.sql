-- Applied via MCP as recent_shop_activity.
-- Real storefront activity for the social-proof pop-up. Returns only what the pop-up shows: product,
-- a real view count (24h, at least 2 views) or a recent purchase with first name and town. Never
-- email, phone, surname, order number or address.
create or replace function public.recent_shop_activity()
returns jsonb
language sql stable security definer set search_path = public as $$
  with views as (
    select p.name, p.slug, count(*)::int as n
    from public.product_views v
    join public.products p on p.id = v.product_id and p.status = 'published'
    where v.viewed_at > now() - interval '24 hours'
    group by p.name, p.slug
    having count(*) >= 2
    order by count(*) desc
    limit 6
  ),
  buys as (
    select distinct on (o.id)
      initcap(nullif(split_part(trim(o.customer_name), ' ', 1), '')) as first_name,
      initcap(nullif(trim(o.shipping_address->>'city'), '')) as town,
      p.name, p.slug, o.created_at
    from public.orders o
    cross join lateral jsonb_array_elements(o.items) it
    join public.variants va on va.id = (it->>'variant_id')::uuid
    join public.products p on p.id = va.product_id and p.status = 'published'
    where o.status = 'paid' and o.created_at > now() - interval '72 hours'
    order by o.id, (it->>'price')::numeric desc
  )
  select jsonb_build_object(
    'views', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'slug', slug, 'count', n)) from views), '[]'::jsonb),
    'purchases', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'slug', slug, 'first_name', first_name, 'town', town, 'at', created_at)
                       order by created_at desc)
      from (select * from buys order by created_at desc limit 6) b
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.recent_shop_activity() from public;
grant execute on function public.recent_shop_activity() to anon, authenticated;
