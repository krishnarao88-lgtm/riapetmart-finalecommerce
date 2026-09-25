import { NextResponse } from "next/server";
import { parseLines, priceCart } from "@/lib/cart-pricing";
import { freeDeliveryMin, type DeliverySettings } from "@/lib/delivery-settings";
import { formatMyr } from "@/lib/pricing";
import { quoteSecret, signQuote } from "@/lib/quote-signature";
import { getLalamoveQuote, LALAMOVE_LIVE } from "@/lib/shipping/lalamove";
import { getEasyParcelQuote } from "@/lib/shipping/easyparcel";
import { createClient } from "@/lib/supabase/server";

type ShippingOption = {
  method: "lalamove" | "easyparcel";
  label: string;
  price: number;
  serviceId?: string;
};

// Store pickup is offered directly by the cart (no address or quote needed), so only delivery is quoted here.
export async function POST(req: Request) {
  const body = (await req.json()) as {
    lines?: unknown;
    addressLine?: string;
    city?: string;
    postcode?: string;
    state?: string;
  };
  const lines = parseLines(body.lines);
  const addressLine = String(body.addressLine ?? "").trim();
  const city = String(body.city ?? "").trim();
  const postcode = String(body.postcode ?? "").trim();
  const state = String(body.state ?? "").trim();
  if (!lines) return NextResponse.json({ error: "Your cart looks invalid — please refresh and try again" }, { status: 400 });
  if (!addressLine || !/^\d{5}$/.test(postcode) || !state) {
    return NextResponse.json({ error: "Enter your address and a 5-digit postcode" }, { status: 400 });
  }

  const supabase = await createClient();
  const [cart, { data: settingsRow }] = await Promise.all([
    priceCart(supabase, lines),
    supabase.from("settings").select("value").eq("key", "delivery").maybeSingle(),
  ]);
  if ("error" in cart) return NextResponse.json({ error: cart.error }, { status: 400 });

  const delivery = (settingsRow?.value ?? {}) as DeliverySettings;
  const freeMin = freeDeliveryMin(delivery);
  const freeDelivery = freeMin !== null && cart.subtotal >= freeMin;
  const freeNote = freeMin !== null ? ` — free over ${formatMyr(freeMin)}` : "";
  const weightKg = Math.max(0.5, cart.weightGrams / 1000);

  const options: ShippingOption[] = [];
  const isSameDayZone = delivery.same_day_states?.includes(state) ?? false;
  const fullAddress = `${addressLine}, ${city}, ${postcode} ${state}, Malaysia`;

  // Sandbox riders never show up, so customers are only offered Lalamove once it's live.
  if (LALAMOVE_LIVE && isSameDayZone && delivery.lalamove_enabled !== false) {
    try {
      const quote = await getLalamoveQuote(fullAddress, weightKg);
      if (quote) {
        options.push({
          method: "lalamove",
          label: freeDelivery ? `Same-day delivery (Lalamove)${freeNote}` : "Same-day delivery (Lalamove)",
          price: freeDelivery ? 0 : quote.price,
        });
      }
    } catch (err) {
      console.error("Lalamove quote failed:", err);
    }
  }

  if (delivery.easyparcel_enabled !== false) {
    try {
      const quote = await getEasyParcelQuote(postcode, state, weightKg);
      if (quote) {
        options.push({
          method: "easyparcel",
          label: freeDelivery ? `Courier — ${quote.courierName}${freeNote}` : `Courier — ${quote.courierName}`,
          price: freeDelivery ? 0 : quote.price,
          serviceId: quote.serviceId,
        });
      }
    } catch (err) {
      console.error("EasyParcel quote failed:", err);
    }
  }

  if (options.length === 0) {
    return NextResponse.json({ error: "No delivery option available for this address" }, { status: 422 });
  }
  const secret = quoteSecret();
  return NextResponse.json({
    options: options.map((o) => ({ ...o, ...signQuote({ ...o, postcode, subtotal: cart.subtotal }, secret) })),
  });
}
