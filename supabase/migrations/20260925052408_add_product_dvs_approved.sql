-- Products approved by the Department of Veterinary Services (DVS) Malaysia get a badge on the shop.
alter table public.products add column is_dvs_approved boolean not null default false;
