import "server-only";
import { createHash } from "node:crypto";
import { site } from "@/lib/site";
import type { Attribution } from "@/lib/attribution";

const GRAPH = "https://graph.facebook.com/v23.0";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Meta wants phones as digits with country code: 012-345 6789 → 60123456789. */
export function normalisePhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("60") ? d : d.startsWith("0") ? `6${d}` : `60${d}`;
}

type Purchase = {
  orderId: string; // same id the browser pixel sends as eventID, so Meta counts the sale once
  value: number;
  items: { variant_id: string; qty: number; price: number }[];
  email?: string | null;
  phone?: string | null;
  attribution?: Attribution | null;
};

/**
 * Reports a paid order to Meta from the server (Conversions API), so sales from iPhones and ad-blockers still
 * reach Facebook ads. Does nothing until META_CAPI_TOKEN is set; never throws, a failed report must not
 * break the payment webhook.
 */
export async function sendMetaPurchase(p: Purchase) {
  const token = process.env.META_CAPI_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!token || !pixelId) return;
  const a = p.attribution ?? {};
  const userData = {
    ...(p.email && { em: [sha256(p.email.trim().toLowerCase())] }),
    ...(p.phone && { ph: [sha256(normalisePhone(p.phone))] }),
    country: [sha256("my")],
    ...(a.fbp && { fbp: a.fbp }),
    ...(a.fbc && { fbc: a.fbc }),
    ...(a.ip && { client_ip_address: a.ip }),
    ...(a.ua && { client_user_agent: a.ua }),
  };
  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: p.orderId,
        action_source: "website",
        event_source_url: `${site.url}/order/success`,
        user_data: userData,
        custom_data: {
          currency: "MYR",
          value: p.value,
          content_type: "product",
          content_ids: p.items.map((i) => i.variant_id),
          contents: p.items.map((i) => ({ id: i.variant_id, quantity: i.qty, item_price: i.price })),
          num_items: p.items.reduce((n, i) => n + i.qty, 0),
        },
      },
    ],
    ...(process.env.META_CAPI_TEST_CODE && { test_event_code: process.env.META_CAPI_TEST_CODE }),
  };
  try {
    const res = await fetch(`${GRAPH}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("Meta CAPI rejected purchase:", res.status, await res.text());
  } catch (err) {
    console.error("Meta CAPI failed:", err);
  }
}
