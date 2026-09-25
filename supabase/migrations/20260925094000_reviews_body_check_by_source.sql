-- Applied via MCP as reviews_body_check_by_source.
alter table public.reviews drop constraint reviews_body_check;
alter table public.reviews add constraint reviews_body_check check (
  case when source = 'website' then char_length(body) between 10 and 1000 else char_length(body) <= 4000 end
);
