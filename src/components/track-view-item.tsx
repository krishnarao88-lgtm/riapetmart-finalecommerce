"use client";

import { useEffect } from "react";

/** GA4 view_item and Meta ViewContent for a product page. No-ops when analytics isn't loaded. */
export function TrackViewItem({ id, name, price }: { id: string; name: string; price: number }) {
  useEffect(() => {
    window.gtag?.("event", "view_item", {
      currency: "MYR",
      value: price,
      items: [{ item_id: id, item_name: name, price }],
    });
    window.fbq?.("track", "ViewContent", { content_ids: [id], content_type: "product", value: price, currency: "MYR" });
  }, [id, name, price]);
  return null;
}
