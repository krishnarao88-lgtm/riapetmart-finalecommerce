export type TrackItem = { item_id: string; item_name: string; item_variant?: string; price: number; quantity: number };

// GA4 event -> Meta Pixel twin (null = GA4 only; Meta has no delivery-choice event).
const events = {
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_shipping_info: null,
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
} as const;

/** GA4 ecommerce event plus its Meta Pixel twin. No-op when neither tag is configured. */
export function track(
  event: keyof typeof events,
  items: TrackItem[],
  { value, transactionId, shippingTier }: { value?: number; transactionId?: string; shippingTier?: string } = {},
) {
  if (typeof window === "undefined") return;
  const total = value ?? Math.round(items.reduce((n, i) => n + i.price * i.quantity, 0) * 100) / 100;
  window.gtag?.("event", event, {
    currency: "MYR",
    value: total,
    items,
    ...(transactionId && { transaction_id: transactionId }),
    ...(shippingTier && { shipping_tier: shippingTier }),
  });
  const metaEvent = events[event];
  if (!metaEvent) return;
  const pixel = {
    currency: "MYR",
    value: total,
    content_type: "product",
    content_ids: items.map((i) => i.item_id),
    contents: items.map((i) => ({ id: i.item_id, quantity: i.quantity, item_price: i.price })),
    num_items: items.reduce((n, i) => n + i.quantity, 0),
  };
  if (transactionId) window.fbq?.("track", metaEvent, pixel, { eventID: transactionId });
  else window.fbq?.("track", metaEvent, pixel);
}
