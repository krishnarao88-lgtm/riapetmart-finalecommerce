export type TrackItem = { item_id: string; item_name: string; item_variant?: string; price: number; quantity: number };

const events = {
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
} as const;

/** GA4 ecommerce event plus its Meta Pixel twin. No-op when neither tag is configured. */
export function track(
  event: keyof typeof events,
  items: TrackItem[],
  { value, transactionId }: { value?: number; transactionId?: string } = {},
) {
  if (typeof window === "undefined") return;
  const total = value ?? Math.round(items.reduce((n, i) => n + i.price * i.quantity, 0) * 100) / 100;
  window.gtag?.("event", event, {
    currency: "MYR",
    value: total,
    items,
    ...(transactionId && { transaction_id: transactionId }),
  });
  const pixel = {
    currency: "MYR",
    value: total,
    content_type: "product",
    content_ids: items.map((i) => i.item_id),
    contents: items.map((i) => ({ id: i.item_id, quantity: i.quantity, item_price: i.price })),
    num_items: items.reduce((n, i) => n + i.quantity, 0),
  };
  if (transactionId) window.fbq?.("track", events[event], pixel, { eventID: transactionId });
  else window.fbq?.("track", events[event], pixel);
}
