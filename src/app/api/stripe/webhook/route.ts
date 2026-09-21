import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getResend } from "@/lib/resend";
import { formatMyr } from "@/lib/pricing";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

type OrderItem = { name: string; title: string; qty: number; price: number };
type OrderForEmail = {
  items: OrderItem[];
  subtotal: number;
  shipping_method: string | null;
  shipping_cost: number;
};

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email ?? null;
    const supabase = await createClient();
    await supabase.rpc("mark_order_paid", {
      p_session_id: session.id,
      p_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
      p_customer_email: customerEmail,
    });

    if (customerEmail) {
      try {
        const { data: order } = (await supabase
          .rpc("get_order_for_email", { p_session_id: session.id })
          .single()) as { data: OrderForEmail | null };
        if (order) {
          const items = order.items;
          const lines = items
            .map((it) => `${it.name} (${it.title}) x${it.qty} — ${formatMyr(it.price * it.qty)}`)
            .join("\n");
          const shippingLine = order.shipping_method
            ? `\nDelivery (${order.shipping_method}): ${formatMyr(Number(order.shipping_cost))}`
            : "";
          await getResend().emails.send({
            from: `${site.name} <orders@${new URL(site.url).hostname}>`,
            to: customerEmail,
            subject: `Your ${site.name} order — ${formatMyr(Number(order.subtotal))}`,
            text: `Thanks for your order!\n\n${lines}${shippingLine}\n\nTotal: ${formatMyr(Number(order.subtotal))}\n\nWe'll be in touch on WhatsApp with delivery updates.\n\n${site.name}\n${site.phone}`,
          });
        }
      } catch (err) {
        console.error("Order confirmation email failed:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
