-- 1. Separate items subtotal from the charged total. Every existing row stored items+delivery in subtotal.
alter table public.orders add column total numeric;
update public.orders set total = subtotal, subtotal = subtotal - coalesce(shipping_cost, 0);
alter table public.orders alter column total set not null;

-- 2. Fulfilment steps and a guard so stock is only deducted once.
alter table public.orders add column fulfilment_status text not null default 'new'
  check (fulfilment_status in ('new', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'));
alter table public.orders add column stock_deducted boolean not null default false;

-- 3. create_pending_order: p_subtotal is items only; p_total is what Stripe charges.
--    Old callers (no p_total) passed items+delivery, handled until the new code is live.
drop function public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb, text, text, text, text);
create function public.create_pending_order(
  p_session_id text, p_items jsonb, p_subtotal numeric, p_customer_email text default null,
  p_shipping_method text default null, p_shipping_cost numeric default 0, p_shipping_address jsonb default null,
  p_shipping_service_id text default null, p_referral_code text default null,
  p_customer_name text default null, p_customer_phone text default null, p_total numeric default null
) returns void
language sql security definer set search_path = public as $$
  insert into public.orders (
    stripe_session_id, items, subtotal, total, customer_email,
    shipping_method, shipping_cost, shipping_address, shipping_service_id, referral_code,
    customer_name, customer_phone, status
  )
  values (
    p_session_id, p_items,
    case when p_total is null then p_subtotal - coalesce(p_shipping_cost, 0) else p_subtotal end,
    coalesce(p_total, p_subtotal), p_customer_email,
    p_shipping_method, p_shipping_cost, p_shipping_address, p_shipping_service_id, p_referral_code,
    p_customer_name, p_customer_phone, 'pending'
  );
$$;

-- 4. mark_order_paid: returns true only on the pending->paid transition (webhook retries are no-ops),
--    and deducts stock first-expiry-first in the same transaction.
drop function public.mark_order_paid(text, text, text);
create function public.mark_order_paid(p_session_id text, p_payment_intent text, p_customer_email text default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_need int;
  v_batch record;
begin
  update public.orders
  set status = 'paid', stripe_payment_intent = p_payment_intent,
      customer_email = coalesce(p_customer_email, customer_email)
  where stripe_session_id = p_session_id and status = 'pending'
  returning * into v_order;
  if not found then return false; end if;

  if not v_order.stock_deducted then
    for v_item in select * from jsonb_array_elements(v_order.items) loop
      v_need := (v_item->>'qty')::int;
      for v_batch in
        select id, quantity from public.stock_batches
        where variant_id = (v_item->>'variant_id')::uuid and quantity > 0
        order by expiry_date nulls last, created_at
        for update
      loop
        exit when v_need <= 0;
        update public.stock_batches set quantity = quantity - least(v_need, v_batch.quantity) where id = v_batch.id;
        v_need := v_need - least(v_need, v_batch.quantity);
      end loop;
    end loop;
    update public.orders set stock_deducted = true where id = v_order.id;
  end if;
  return true;
end;
$$;

-- 5. Referral reward only for a different person's first paid order.
create or replace function public.get_referral_reward_target(p_session_id text)
returns table (order_id uuid, owner_email text)
language sql security definer set search_path = public as $$
  select o.id, rc.owner_email
  from public.orders o
  join public.referral_codes rc on rc.code = o.referral_code
  where o.stripe_session_id = p_session_id
    and o.referral_rewarded = false
    and o.customer_email is not null
    and lower(o.customer_email) <> lower(rc.owner_email)
    and not exists (
      select 1 from public.orders prev
      where lower(prev.customer_email) = lower(o.customer_email)
        and prev.status = 'paid' and prev.id <> o.id and prev.created_at < o.created_at
    );
$$;

-- 6. Referral code for the signed-in user only (no email parameter to spoof).
create function public.get_or_create_my_referral_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_code text;
  v_base text;
begin
  if v_email is null then raise exception 'sign in required'; end if;
  select code into v_code from public.referral_codes where lower(owner_email) = v_email;
  if v_code is not null then return v_code; end if;
  v_base := regexp_replace(split_part(v_email, '@', 1), '[^a-z0-9]', '', 'g');
  if v_base = '' then v_base := 'friend'; end if;
  insert into public.referral_codes (code, owner_email) values (v_base || '-' || substr(md5(random()::text), 1, 4), v_email)
  on conflict (owner_email) do update set owner_email = excluded.owner_email
  returning code into v_code;
  return v_code;
end;
$$;
grant execute on function public.get_or_create_my_referral_code() to authenticated;

-- 7. list_staff: admins only. handle_new_user: case-insensitive allowlist match.
create or replace function public.list_staff()
returns table (email text)
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  return query select a.email::text from public.admin_allowlist a where a.role = 'staff' order by a.email;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id, new.email,
    coalesce((select a.role from public.admin_allowlist a where lower(a.email) = lower(new.email)), 'customer')
  );
  return new;
end;
$$;

-- 8. Storage: images only, 5 MB max. Admin can read product-images (so deletes remove the file).
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/*'] where id in ('product-images', 'review-images');
create policy "admin reads product images" on storage.objects
  for select using (bucket_id = 'product-images' and (select private.is_admin()));
