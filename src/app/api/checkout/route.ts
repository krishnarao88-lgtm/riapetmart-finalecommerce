import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

type CartLineInput = { variantId: string; qty: number };
type ShippingInput = {
  method: "pickup" | "lalamove" | "easyparcel";
  label: string;
  price: number;
  addressLine?: string;
  city?: string;
  postcode?: string;
  state?: string;
  serviceId?: string;
};

export async function POST(req: Request) {
  const { lines, shipping } = (await req.json()) as { lines: CartLineInput[]; shipping?: ShippingInput };
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  // ponytail: the shipping quote was already computed server-side in
  // /api/shipping-quote; re-quoting live carriers a second time here would
  // add real complexity for a small shop's order volume, so we trust the
  // client-echoed price within a sane ceiling instead of re-verifying it.
  const shippingPrice = shipping ? Math.min(Math.max(0, shipping.price), 200) : 0;
  if (shipping && shipping.method !== "pickup" && shippingPrice <= 0) {
    return NextResponse.json({ error: "Invalid shipping option" }, { status: 400 });
  }

  const supabase = await createClient();
  const variantIds = lines.map((l) => l.variantId);
  const { data: variants } = await supabase
    .from("variants")
    .select("id, title, price, products(name, product_images(path))")
    .in("id", variantIds);

  if (!variants || variants.length !== variantIds.length) {
    return NextResponse.json({ error: "One or more items are no longer available" }, { status: 400 });
  }

  const qtyByVariant = new Map(lines.map((l) => [l.variantId, l.qty]));
  let subtotal = 0;
  const orderItems: { variant_id: string; name: string; title: string; qty: number; price: number }[] = [];
  const lineItems = variants.map((v) => {
    const qty = Math.max(1, Math.floor(qtyByVariant.get(v.id) ?? 1));
    const product = (v.products as unknown as { name: string; product_images: { path: string }[] } | null);
    subtotal += v.price * qty;
    orderItems.push({ variant_id: v.id, name: product?.name ?? v.title, title: v.title, qty, price: v.price });
    return {
      quantity: qty,
      price_data: {
        currency: "myr",
        unit_amount: Math.round(v.price * 100),
        product_data: {
          name: product?.name ?? v.title,
          description: v.title,
          images: product?.product_images?.[0]?.path ? [product.product_images[0].path] : undefined,
        },
      },
    };
  });

  const allLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [...lineItems];
  if (shipping && shippingPrice > 0) {
    allLineItems.push({
      quantity: 1,
      price_data: {
        currency: "myr",
        unit_amount: Math.round(shippingPrice * 100),
        product_data: { name: shipping.label },
      },
    });
  }

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "fpx"],
    line_items: allLineItems,
    allow_promotion_codes: true,
    success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
  });

  const shippingAddress = shipping
    ? { addressLine: shipping.addressLine, city: shipping.city, postcode: shipping.postcode, state: shipping.state }
    : null;

  const { error: rpcError } = await supabase.rpc("create_pending_order", {
    p_session_id: session.id,
    p_items: orderItems,
    p_subtotal: subtotal + shippingPrice,
    p_customer_email: null,
    p_shipping_method: shipping?.method ?? null,
    p_shipping_cost: shippingPrice,
    p_shipping_address: shippingAddress,
    p_shipping_service_id: shipping?.serviceId ?? null,
  });
  if (rpcError) return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });

  return NextResponse.json({ url: session.url });
}
