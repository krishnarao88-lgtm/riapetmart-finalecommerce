-- Marketplace reviews copied from Shopee/Lazada without their star rating are shown as text only; a star rating is
-- never invented. Website reviews still require one (the review form enforces 1-5).
alter table public.reviews alter column rating drop not null;
alter table public.reviews drop constraint reviews_source_check;
alter table public.reviews add constraint reviews_source_check check (source = any (array['website','tiktok','shopee','lazada']));
alter table public.reviews add constraint reviews_website_rating check (source <> 'website' or rating is not null);
