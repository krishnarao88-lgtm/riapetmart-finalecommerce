alter table public.reviews add column product_id uuid references public.products(id) on delete set null;

create table public.review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);

alter table public.review_images enable row level security;

create policy "public reads images of approved reviews" on public.review_images
  for select using (exists (select 1 from public.reviews r where r.id = review_images.review_id and r.status = 'approved'));

create policy "admin reads all review images" on public.review_images
  for select using ((select private.is_admin()));

create policy "admin deletes review images" on public.review_images
  for delete using ((select private.is_admin()));

insert into storage.buckets (id, name, public) values ('review-images', 'review-images', true);

create policy "public uploads review images" on storage.objects
  for insert with check (bucket_id = 'review-images');

create policy "admin deletes review image files" on storage.objects
  for delete using (bucket_id = 'review-images' and (select private.is_admin()));

drop function public.submit_review(uuid, text, text, smallint, text);

create function public.submit_review(
  p_order_id uuid, p_customer_name text, p_customer_email text, p_rating smallint, p_body text,
  p_product_id uuid default null, p_image_paths text[] default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_path text;
begin
  insert into public.reviews (order_id, customer_name, customer_email, rating, body, product_id)
  values (p_order_id, trim(p_customer_name), lower(trim(p_customer_email)), p_rating, trim(p_body), p_product_id)
  returning id into v_id;

  if p_image_paths is not null then
    foreach v_path in array p_image_paths loop
      insert into public.review_images (review_id, path) values (v_id, v_path);
    end loop;
  end if;

  return v_id;
end;
$$;

grant execute on function public.submit_review to anon, authenticated;

create policy "admin deletes reviews" on public.reviews
  for delete using ((select private.is_admin()));
