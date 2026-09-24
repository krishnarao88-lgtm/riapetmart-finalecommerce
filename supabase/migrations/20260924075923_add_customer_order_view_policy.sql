create policy "customer views own orders" on public.orders
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = customer_email);
