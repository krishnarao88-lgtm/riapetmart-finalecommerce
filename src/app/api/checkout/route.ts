import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { cleanAttribution, sourceLabel } from "@/lib/attribution";
import { parseLines, priceCart } from "@/lib/cart-pricing";
import type { DeliverySettings } from "@/lib/delivery-settings";
import { quoteSecret, verifyQuote } from "@/lib/quote-signature";
import { lalamoveDelivery } from "@/lib/shipping/lalamove-rules";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyTelegram, tg } from "@/lib/telegram";
import { formatMyr } from "@/lib/pricing";
import { CODES_NOT_ON_SALE, resolvePromoCode } from "@/lib/promo-code";
import { readWelcomeOffer } from "@/lib/welcome-offer";

type ShippingInput = {
  method?: string;
  price?: number;
  serviceId?: string;
  expires?: number;
  sig?: string;
  addressLine?: string;
  city?: string;
  postcode?: string;
  state?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MY_MOBILE = /^(?:\+?60|0)1\d{8,9}$/;
const DELIVERY_LABELS: Record<string, string> = { lalamove: "Lalamove delivery", easyparcel: "Courier delivery" };

export async function POST(req: Request) {
  const body = (await req.json()) as {
    lines?: unknown;
    shipping?: ShippingInput;
    referralCode?: string;
    customerName?: string;
    customerPhone?: string;
    email?: string;
    attribution?: unknown;
    promoCode?: string;
  };
  const lines = parseLines(body.lines);
  if (!lines) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  const customerName = String(body.customerName ?? "").trim();
  const customerPhone = String(body.customerPhone ?? "").trim();
  if (!customerName || !MY_MOBILE.test(customerPhone.replace(/[\s-]/g, ""))) {
    return NextResponse.json({ error: "Enter your name and a Malaysian mobile number" }, { status: 400 });
  }
  const email = String(body.email ?? "").trim();
  const shipping = body.shipping;
  const method = shipping?.method;
  if (!shipping || !method || !(method === "pickup" || Object.hasOwn(DELIVERY_LABELS, method))) {
    return NextResponse.json({ error: "Choose pickup or delivery" }, { status: 400 });
  }

  const supabase = await createClient();
  const [cart, { data: settingsRow }] = await Promise.all([
    priceCart(supabase, lines),
    supabase.from("settings").select("value").eq("key", "delivery").maybeSingle(),
  ]);
  if ("error" in cart) return NextResponse.json({ error: cart.error }, { status: 400 });
  const delivery = (settingsRow?.value ?? {}) as DeliverySettings;

  const isPickup = method === "pickup";
  let shippingPrice = 0;
  if (isPickup) {
    if (delivery.pickup_enabled === false) {
      return NextResponse.json({ error: "Store pickup is not available right now" }, { status: 400 });
    }
  } else {
    const postcode = String(shipping.postcode ?? "").trim();
    const quote = {
      method,
      price: Number(shipping.price),
      serviceId: shipping.serviceId,
      postcode,
      subtotal: cart.subtotal,
    };
    if (!shipping.addressLine?.trim() || !shipping.state?.trim() || !verifyQuote(quote, shipping, quoteSecret())) {
      return NextResponse.json(
        { error: "Your delivery quote has expired or your cart changed — please get delivery options again" },
        { status: 400 },
      );
    }
    // The signed quote already has the free-delivery allowance taken off, for this exact subtotal.
    shippingPrice = Math.max(0, quote.price);
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((it) => ({
    quantity: it.qty,
    price_data: {
      currency: "myr",
      unit_amount: Math.round(it.price * 100),
      product_data: { name: it.name, description: it.title, images: it.image ? [it.image] : undefined },
    },
  }));
  if (shippingPrice > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "myr",
        unit_amount: Math.round(shippingPrice * 100),
        product_data: { name: method === "lalamove" ? lalamoveDelivery().short : DELIVERY_LABELS[method] },
      },
    });
  }

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  // Promo codes on top of clearance/bundle/sale prices can sell below cost; the owner can switch that off.
  const offer = await readWelcomeOffer();
  const codesAllowed = offer.stack_with_discounts || !cart.items.some((it) => it.discount);
  // A code typed in the cart is checked again here and applied for the shopper, so they don't have to find
  // Stripe's own "Add promotion code" link. Without one, Stripe's field stays available as before.
  const typedCode = typeof body.promoCode === "string" ? body.promoCode.trim() : "";
  let promotionCodeId: string | null = null;
  if (typedCode) {
    if (!codesAllowed) return NextResponse.json({ error: CODES_NOT_ON_SALE }, { status: 400 });
    const promo = await resolvePromoCode(typedCode);
    if (!promo.ok) return NextResponse.json({ error: promo.error }, { status: 400 });
    promotionCodeId = promo.id;
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : { allow_promotion_codes: codesAllowed }),
      customer_email: EMAIL.test(email) ? email : undefined,
      metadata: { customer_phone: customerPhone, delivery_method: method },
      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      // Unpaid checkouts close after 2 hours (Stripe's minimum is 30 min, default 24 h) so the "complete your
      // order" email goes out the same day, with Stripe's link that reopens this exact checkout.
      expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
      // Stripe can't allow promotion codes on the recovered session when this one already carries a code
      // (`discounts`); asking for both failed every checkout with a typed code. The recovered session keeps the code.
      after_expiration: { recovery: { enabled: true, allow_promotion_codes: codesAllowed && !promotionCodeId } },
    });
  } catch (err) {
    // Never answer with an empty 500: the cart shows this message and the owner hears about it straight away.
    console.error("Stripe checkout session failed:", err);
    await notifyTelegram(
      `⚠️ <b>Checkout failed</b> — ${tg(customerName)} · ${tg(customerPhone)}\n` +
        `${tg(err instanceof Error ? err.message : String(err))}`,
    );
    return NextResponse.json(
      { error: "We couldn't open the payment page. Please try again, or tap “Order via WhatsApp” and we'll help." },
      { status: 502 },
    );
  }

  const shippingAddress = isPickup
    ? null
    : { addressLine: shipping.addressLine, city: shipping.city, postcode: shipping.postcode, state: shipping.state };

  const { error: rpcError } = await createServiceClient().rpc("create_pending_order", {
    p_session_id: session.id,
    // list_price + discount let Admin → Finance show what each discount cost.
    p_items: cart.items.map(({ variant_id, name, title, qty, price, list_price, discount }) => ({
      variant_id,
      name,
      title,
      qty,
      price,
      list_price,
      discount,
    })),
    p_subtotal: cart.subtotal,
    p_total: Math.round((cart.subtotal + shippingPrice) * 100) / 100,
    p_customer_email: null,
    p_shipping_method: method,
    p_shipping_cost: shippingPrice,
    p_shipping_address: shippingAddress,
    p_shipping_service_id: isPickup ? null : (shipping.serviceId ?? null),
    p_referral_code: typeof body.referralCode === "string" ? body.referralCode.slice(0, 64) : null,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
  });
  if (rpcError) return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });

  // Which ad/channel brought this shopper; also the Meta match fields for the server-side Purchase report.
  const attribution = cleanAttribution(body.attribution, {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    ua: h.get("user-agent"),
  });
  if (attribution) {
    await createServiceClient().from("orders").update({ attribution }).eq("stripe_session_id", session.id);
  }

  await notifyTelegram(
    `💳 <b>Checkout started</b> — ${tg(customerName)} · ${tg(customerPhone)}\n` +
      `${cart.items.map((it) => `• ${tg(it.name)} (${tg(it.title)}) × ${it.qty}`).join("\n")}\n` +
      `Total ${tg(formatMyr(cart.subtotal + shippingPrice))} · ${isPickup ? "store pickup" : tg(method)} (not paid yet)\n` +
      `Source: ${tg(sourceLabel(attribution))}`,
  );
  return NextResponse.json({ url: session.url });
}
