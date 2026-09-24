import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { FROM, getResend } from "@/lib/resend";
import { formatMyr } from "@/lib/pricing";
import { site } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";

type OrderItem = { name: string; title: string; qty: number; price: number };
type OrderForEmail = {
  items: OrderItem[];
  shipping_method: string | null;
  shipping_cost: number;
  total: number;
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

  const supabase = createServiceClient();

  if (event.type === "checkout.session.expired") {
    const { error } = await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("stripe_session_id", event.data.object.id)
      .eq("status", "pending");
    if (error) return NextResponse.json({ error: "Could not update order" }, { status: 500 });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    // charge.refunded also fires for partial refunds; only a full refund marks the order refunded.
    if (paymentIntent && charge.refunded) {
      const { error } = await supabase
        .from("orders")
        .update({ fulfilment_status: "refunded" })
        .eq("stripe_payment_intent", paymentIntent);
      if (error) return NextResponse.json({ error: "Could not update order" }, { status: 500 });
    }
  }

  if (
    (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
    event.data.object.payment_status !== "unpaid"
  ) {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email ?? null;
    const { data: justPaid, error: paidError } = await supabase.rpc("mark_order_paid", {
      p_session_id: session.id,
      p_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
      p_customer_email: customerEmail,
    });
    if (paidError) {
      console.error("mark_order_paid failed:", paidError);
      return NextResponse.json({ error: "Could not mark order paid" }, { status: 500 });
    }
    // false = already processed on an earlier delivery of this event; don't email or reward twice.
    if (justPaid !== true) return NextResponse.json({ received: true });

    if (customerEmail) await supabase.rpc("mark_cart_recovered", { p_email: customerEmail });

    if (customerEmail) {
      try {
        const { data: order } = (await supabase
          .from("orders")
          .select("items, shipping_method, shipping_cost, total")
          .eq("stripe_session_id", session.id)
          .single()) as { data: OrderForEmail | null };
        if (order) {
          const lines = order.items
            .map((it) => `${it.name} (${it.title}) x${it.qty} — ${formatMyr(it.price * it.qty)}`)
            .join("\n");
          const shippingLine = order.shipping_method
            ? `\n${order.shipping_method === "pickup" ? "Store pickup" : `Delivery (${order.shipping_method})`}: ${
                Number(order.shipping_cost) > 0 ? formatMyr(Number(order.shipping_cost)) : "Free"
              }`
            : "";
          const total = formatMyr(Number(order.total));
          await getResend().emails.send({
            from: FROM,
            to: customerEmail,
            subject: `Your ${site.name} order — ${total}`,
            text: `Thanks for your order!\n\n${lines}${shippingLine}\n\nTotal: ${total}\n\nWe'll be in touch on WhatsApp with delivery updates.\n\n${site.name}\n${site.phone}`,
          });
        }
      } catch (err) {
        console.error("Order confirmation email failed:", err);
      }
    }

    try {
      const { data: referralRows } = await supabase.rpc("get_referral_reward_target", { p_session_id: session.id });
      const referral = (referralRows as { order_id: string; owner_email: string }[] | null)?.[0];
      if (referral) {
        const promo = await getStripe().promotionCodes.create({
          promotion: { type: "coupon", coupon: "welcome10" },
          max_redemptions: 1,
          code: `REF${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        });
        await getResend().emails.send({
          from: FROM,
          to: referral.owner_email,
          subject: "Your friend just ordered — here's your 10% off 🐾",
          text: `Thanks for sharing ${site.name}! Your friend just placed their first order.\n\nHere's your reward code: ${promo.code}\n\nUse it at checkout for 10% off your next order: ${site.url}/shop\n\n${site.name}`,
        });
        await supabase.rpc("mark_referral_rewarded", { p_order_id: referral.order_id });
      }
    } catch (err) {
      console.error("Referral reward failed:", err);
    }
  }

  return NextResponse.json({ received: true });
}
