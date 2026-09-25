-- Bulk stock editing for the admin products table and the Excel import.
-- p_mode 'set': make each variant's total stock equal quantity. Increases add one new batch;
--   decreases take from the soonest-expiring batches first (same order as mark_order_paid).
-- p_mode 'add': add quantity as a new batch.
-- p_items: [{ "variant_id": uuid, "quantity": int, "expiry_date": "YYYY-MM-DD"?, "batch_no": text? }]
create function public.admin_set_stock(p_items jsonb, p_mode text default 'set')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_variant uuid;
  v_target int;
  v_current int;
  v_need int;
  v_batch record;
  v_count int := 0;
begin
  if not private.is_admin() then
    raise exception 'Only admins can change stock' using errcode = '42501';
  end if;
  if p_mode not in ('set', 'add') then
    raise exception 'Unknown stock mode %', p_mode;
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 2000 then
    raise exception 'Send between 1 and 2000 stock changes at a time';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_variant := (v_item->>'variant_id')::uuid;
    v_target := (v_item->>'quantity')::int;
    if v_target is null or v_target < 0 then
      raise exception 'Stock must be a whole number, 0 or more';
    end if;

    -- Lock the variant so two edits (or an order) can't interleave on its batches.
    perform 1 from public.variants where id = v_variant for update;
    if not found then
      raise exception 'Variant % not found', v_variant;
    end if;

    if p_mode = 'add' then
      if v_target > 0 then
        insert into public.stock_batches (variant_id, quantity, expiry_date, batch_no)
        values (v_variant, v_target, nullif(v_item->>'expiry_date', '')::date, nullif(v_item->>'batch_no', ''));
      end if;
    else
      select coalesce(sum(quantity), 0) into v_current from public.stock_batches where variant_id = v_variant;
      if v_target > v_current then
        insert into public.stock_batches (variant_id, quantity, expiry_date, batch_no)
        values (v_variant, v_target - v_current, nullif(v_item->>'expiry_date', '')::date, nullif(v_item->>'batch_no', ''));
      elsif v_target < v_current then
        v_need := v_current - v_target;
        for v_batch in
          select id, quantity from public.stock_batches
          where variant_id = v_variant and quantity > 0
          order by expiry_date nulls last, created_at
          for update
        loop
          exit when v_need = 0;
          update public.stock_batches set quantity = quantity - least(v_need, v_batch.quantity) where id = v_batch.id;
          v_need := v_need - least(v_need, v_batch.quantity);
        end loop;
        delete from public.stock_batches where variant_id = v_variant and quantity = 0;
      end if;
    end if;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.admin_set_stock(jsonb, text) from public, anon;
grant execute on function public.admin_set_stock(jsonb, text) to authenticated, service_role;
