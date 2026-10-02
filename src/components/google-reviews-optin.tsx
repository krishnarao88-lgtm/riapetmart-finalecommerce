"use client";

import { useEffect } from "react";

type OptIn = { orderId: string; email: string; deliveryDate: string };
type Gapi = { load: (name: string, cb: () => void) => void; surveyoptin: { render: (o: object) => void } };

// Google Customer Reviews: Google asks the shopper to rate us after delivery; the ratings feed Shopping seller stars.
export function GoogleReviewsOptIn({ orderId, email, deliveryDate }: OptIn) {
  useEffect(() => {
    const w = window as unknown as { renderOptIn?: () => void; gapi?: Gapi };
    w.renderOptIn = () =>
      w.gapi?.load("surveyoptin", () =>
        w.gapi?.surveyoptin.render({
          merchant_id: 5682932813,
          order_id: orderId,
          email,
          delivery_country: "MY",
          estimated_delivery_date: deliveryDate,
        }),
      );
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
    s.async = true;
    document.body.appendChild(s);
    return () => s.remove();
  }, [orderId, email, deliveryDate]);
  return null;
}
