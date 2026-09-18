import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

type CartLineInput = { variantId: string; qty: number };

export async function POST(req: Request) {
  const { lines } = (await req.json()) as { lines: CartLineInput[] };
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
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

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "fpx"],
    line_items: lineItems,
    success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
  });

  const { error: rpcError } = await supabase.rpc("create_pending_order", {
    p_session_id: session.id,
    p_items: orderItems,
    p_subtotal: subtotal,
    p_customer_email: null,
  });
  if (rpcError) return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });

  return NextResponse.json({ url: session.url });
}
