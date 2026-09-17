-- Columns the catalogue import needs: pack size shown to shoppers, a stable
-- reference back to the source workbook row, and review flags carried over from it.

alter table public.products
  add column size_display text,
  add column source_ref text unique,
  add column needs_review boolean not null default false,
  add column review_notes text;

comment on column public.products.source_ref is 'Row id from the imported workbook (e.g. RPM-PDF-0001); used to update instead of duplicate on re-import.';
