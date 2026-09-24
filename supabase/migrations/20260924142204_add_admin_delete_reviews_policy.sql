create policy "admin deletes reviews" on public.reviews
  for delete using ((select private.is_admin()));
