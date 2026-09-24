-- Server-only functions: the app now calls these with the service-role key.
-- Postgres grants EXECUTE to PUBLIC by default, so revoke from public as well as the API roles.
do $$
declare f text;
begin
  foreach f in array array[
    'public.create_pending_order(text, jsonb, numeric, text, text, numeric, jsonb, text, text, text, text, numeric)',
    'public.mark_order_paid(text, text, text)',
    'public.get_order_for_email(text)',
    'public.get_carts_to_remind()',
    'public.mark_cart_reminded(text)',
    'public.mark_cart_recovered(text)',
    'public.get_orders_to_replenish()',
    'public.mark_order_replenished(uuid)',
    'public.get_orders_to_request_review()',
    'public.mark_review_requested(uuid)',
    'public.get_referral_reward_target(text)',
    'public.mark_referral_rewarded(uuid)',
    'public.save_abandoned_cart(text, jsonb, numeric)',
    'public.add_newsletter_signup(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;

  -- Signed-in only (they check the caller themselves); never anonymous.
  foreach f in array array[
    'public.get_or_create_my_referral_code()',
    'public.invite_staff(text)',
    'public.remove_staff(text)',
    'public.list_staff()',
    'public.save_easyparcel_booking(uuid, text, text, text, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Replaced by get_or_create_my_referral_code(), which uses the caller's own email.
drop function public.get_or_create_referral_code(text);

-- Review photos are now uploaded by the server only.
drop policy "public uploads review images" on storage.objects;
