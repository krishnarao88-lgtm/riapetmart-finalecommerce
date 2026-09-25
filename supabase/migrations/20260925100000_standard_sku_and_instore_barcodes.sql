-- Applied via MCP as standard_sku_and_instore_barcodes + code_triggers_security_definer.
-- Standard codes: SKU = BRAND-PPP-VV (brand code, product number within the brand, pack/size number),
-- barcode = in-store EAN-13 from the GS1 restricted-circulation range 20..., which never clashes with
-- a manufacturer barcode. Old SKUs are kept in legacy_sku so older spreadsheets still import cleanly.
alter table public.brands add column code text unique;
alter table public.products add column sku_no integer;
alter table public.variants add column legacy_sku text;
create unique index products_brand_sku_no on public.products (coalesce(brand_id, '00000000-0000-0000-0000-000000000000'::uuid), sku_no);
create sequence private.instore_barcode_seq;

create or replace function private.ean13(p_first12 text) returns text language sql immutable as $$
  select p_first12 || ((10 - (
    select sum(substr(p_first12, i, 1)::int * case when i % 2 = 0 then 3 else 1 end) % 10
    from generate_series(1, 12) i
  )) % 10)::text;
$$;

create or replace function private.next_instore_barcode() returns text
language sql security definer set search_path = public, private as $$
  select private.ean13('20' || lpad(nextval('private.instore_barcode_seq')::text, 10, '0'));
$$;

create or replace function private.new_brand_code(p_name text) returns text
language plpgsql security definer set search_path = public, private as $$
declare
  base text := left(upper(regexp_replace(coalesce(p_name, ''), '[^A-Za-z0-9]', '', 'g')), 4);
  candidate text;
  n int := 1;
begin
  if base = '' then base := 'BRND'; end if;
  candidate := base;
  while exists (select 1 from public.brands where code = candidate) loop
    n := n + 1;
    candidate := left(base, 3) || n;
  end loop;
  return candidate;
end;
$$;

create or replace function private.brand_code_default() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.code is null or new.code = '' then new.code := private.new_brand_code(new.name); end if;
  new.code := upper(new.code);
  return new;
end;
$$;
create trigger brands_code_default before insert on public.brands
for each row execute function private.brand_code_default();

create or replace function private.standard_sku(p_product_id uuid) returns text
language plpgsql security definer set search_path = public, private as $$
declare
  v_brand uuid;
  v_code text;
  v_no int;
  v_var int;
  v_sku text;
begin
  select p.brand_id, p.sku_no, coalesce(b.code, 'RPM') into v_brand, v_no, v_code
  from public.products p left join public.brands b on b.id = p.brand_id
  where p.id = p_product_id
  for update of p;
  if v_no is null then
    select coalesce(max(sku_no), 0) + 1 into v_no from public.products where brand_id is not distinct from v_brand;
    update public.products set sku_no = v_no where id = p_product_id;
  end if;
  v_var := 1;
  loop
    v_sku := v_code || '-' || lpad(v_no::text, 3, '0') || '-' || lpad(v_var::text, 2, '0');
    exit when not exists (select 1 from public.variants where sku = v_sku);
    v_var := v_var + 1;
  end loop;
  return v_sku;
end;
$$;

create or replace function private.variant_codes_default() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.legacy_sku is null and new.sku is not null and new.sku !~ '^[A-Z0-9]{2,4}-\d{3}-\d{2}$' then
    new.legacy_sku := new.sku;
  end if;
  if new.sku is null or new.sku !~ '^[A-Z0-9]{2,4}-\d{3}-\d{2}$' then
    new.sku := private.standard_sku(new.product_id);
  end if;
  if new.barcode is null or new.barcode = '' then new.barcode := private.next_instore_barcode(); end if;
  return new;
end;
$$;
create trigger variants_codes_default before insert on public.variants
for each row execute function private.variant_codes_default();
revoke all on function private.standard_sku(uuid), private.next_instore_barcode(), private.new_brand_code(text) from public;

-- Backfill (run once): brand codes, product numbers A-Z within brand, then SKUs and barcodes.
do $$
declare b record;
begin
  for b in select id, name from public.brands order by name loop
    update public.brands set code = private.new_brand_code(b.name) where id = b.id;
  end loop;
end $$;
with numbered as (select id, row_number() over (partition by brand_id order by name, id) as n from public.products)
update public.products p set sku_no = numbered.n from numbered where numbered.id = p.id;
with ordered as (
  select v.id,
         coalesce(b.code, 'RPM') || '-' || lpad(p.sku_no::text, 3, '0') || '-' ||
           lpad(row_number() over (partition by v.product_id order by v.sort, v.created_at, v.id)::text, 2, '0') as new_sku,
         row_number() over (order by coalesce(b.code, 'RPM'), p.sku_no, v.sort, v.created_at, v.id) as seq
  from public.variants v join public.products p on p.id = v.product_id left join public.brands b on b.id = p.brand_id
)
update public.variants v
set legacy_sku = v.sku, sku = ordered.new_sku,
    barcode = coalesce(nullif(v.barcode, ''), private.ean13('20' || lpad(ordered.seq::text, 10, '0')))
from ordered where ordered.id = v.id;
select setval('private.instore_barcode_seq', (select count(*) from public.variants));
