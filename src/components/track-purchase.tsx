"use client";

import { useEffect } from "react";
import { track, type TrackItem } from "@/lib/track";

export function TrackPurchase({ orderId, value, items }: { orderId: string; value: number; items: TrackItem[] }) {
  useEffect(() => {
    // gtag/fbq are injected afterInteractive and may not exist yet on first paint; give them ~5s.
    let tries = 0;
    const timer = setInterval(() => {
      if (!window.gtag && !window.fbq && ++tries < 20) return;
      clearInterval(timer);
      const key = `riapetmart:purchase:${orderId}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // storage blocked: fire anyway, a rare double count beats a lost sale
      }
      track("purchase", items, { value, transactionId: orderId });
    }, 250);
    return () => clearInterval(timer);
  }, [orderId, value, items]);
  return null;
}
