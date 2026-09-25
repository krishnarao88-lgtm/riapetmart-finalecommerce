-- Applied via MCP as marketplace_reviews, marketplace_reviews_unique, reviews_hide_email_and_admin_import.
alter table public.reviews
  add column source text not null default 'website' check (source in ('website', 'tiktok', 'shopee')),
  add column external_ref text,
  add column marketplace_product_id text,
  alter column customer_email drop not null;
-- Website reviews have null external_ref, and nulls never collide, so this only dedupes imports.
alter table public.reviews add constraint reviews_source_external_ref unique (source, external_ref, marketplace_product_id);

-- Approved reviews are public, but the reviewer's email must never be: column-level grant.
revoke select on public.reviews from anon, authenticated;
grant select (id, order_id, customer_name, rating, body, status, created_at, product_id, source, external_ref, marketplace_product_id)
  on public.reviews to anon, authenticated;

create or replace function public.admin_review_emails()
returns table (id uuid, customer_email text)
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  return query select r.id, r.customer_email from public.reviews r;
end;
$$;
revoke all on function public.admin_review_emails() from public, anon;
grant execute on function public.admin_review_emails() to authenticated;

create policy "admin imports marketplace reviews" on public.reviews for insert
  with check ((select private.is_admin()) and source in ('tiktok', 'shopee'));
