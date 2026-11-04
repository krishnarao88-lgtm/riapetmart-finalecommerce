import { allow, clientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { parcelKg } from "@/lib/shipping/parcel";
import { parseLines, priceCart } from "@/lib/cart-pricing";
import { freeDeliveryCap, freeDeliveryMin, type DeliverySettings } from "@/lib/delivery-settings";
import { deliveryCharge, formatMyr } from "@/lib/pricing";
import { quoteSecret, signQuote } from "@/lib/quote-signature";
import { getLalamoveQuote, LALAMOVE_LIVE } from "@/lib/shipping/lalamove";
import { lalamoveDelivery } from "@/lib/shipping/lalamove-rules";
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
  if (!allow(`quote:${clientIp(req)}`, 40)) {
    return NextResponse.json({ error: "Too many delivery checks. Please wait a few minutes and try again." }, { status: 429 });
  }
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
  const cap = freeDeliveryCap(delivery);
  const charge = (raw: number) => deliveryCharge(raw, cart.subtotal, freeMin, cap);
  // "free" when we cover it all, otherwise say how much we took off.
  const note = (raw: number) =>
    freeMin === null || cart.subtotal < freeMin
      ? ""
      : charge(raw) === 0
        ? ` — free over ${formatMyr(freeMin)}`
        : ` — ${formatMyr(raw - charge(raw))} off (order over ${formatMyr(freeMin)})`;
  const weightKg = parcelKg(cart.weightGrams, cart.volumetricGrams);

  const options: ShippingOption[] = [];
  const isSameDayZone = delivery.same_day_states?.includes(state) ?? false;
  const fullAddress = `${addressLine}, ${city}, ${postcode} ${state}, Malaysia`;

  // Both carriers are asked at once: one after the other left the Pay button greyed out for several seconds.
  // Sandbox riders never show up, so customers are only offered Lalamove once it's live.
  const [lala, ep] = await Promise.all([
    LALAMOVE_LIVE && isSameDayZone && delivery.lalamove_enabled !== false
      ? getLalamoveQuote(fullAddress, weightKg).catch((err) => (console.error("Lalamove quote failed:", err), null))
      : null,
    delivery.easyparcel_enabled !== false
      ? getEasyParcelQuote(postcode, state, weightKg).catch((err) => (console.error("EasyParcel quote failed:", err), null))
      : null,
  ]);
  if (lala) options.push({ method: "lalamove", label: `${lalamoveDelivery().label}${note(lala.price)}`, price: charge(lala.price) });
  if (ep) {
    options.push({
      method: "easyparcel",
      label: `Courier — ${ep.courierName}${note(ep.price)}`,
      price: charge(ep.price),
      serviceId: ep.serviceId,
    });
  }

  if (options.length === 0) {
    return NextResponse.json({ error: "No delivery option available for this address" }, { status: 422 });
  }
  const secret = quoteSecret();
  return NextResponse.json({
    options: options.map((o) => ({ ...o, ...signQuote({ ...o, postcode, subtotal: cart.subtotal }, secret) })),
  });
}
