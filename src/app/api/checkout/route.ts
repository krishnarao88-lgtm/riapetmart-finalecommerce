import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { parseLines, priceCart } from "@/lib/cart-pricing";
import type { DeliverySettings } from "@/lib/delivery-settings";
import { quoteSecret, verifyQuote } from "@/lib/quote-signature";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
const DELIVERY_LABELS: Record<string, string> = { lalamove: "Same-day delivery (Lalamove)", easyparcel: "Courier delivery" };

export async function POST(req: Request) {
  const body = (await req.json()) as {
    lines?: unknown;
    shipping?: ShippingInput;
    referralCode?: string;
    customerName?: string;
    customerPhone?: string;
    email?: string;
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
        product_data: { name: DELIVERY_LABELS[method] },
      },
    });
  }

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    allow_promotion_codes: true,
    customer_email: EMAIL.test(email) ? email : undefined,
    metadata: { customer_phone: customerPhone },
    success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
  });

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

  return NextResponse.json({ url: session.url });
}
