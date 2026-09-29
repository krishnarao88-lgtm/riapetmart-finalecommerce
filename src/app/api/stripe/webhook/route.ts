import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { formatMyr } from "@/lib/pricing";
import { sendTemplate } from "@/lib/resend";
import { createServiceClient } from "@/lib/supabase/service";
import { orderConfirmed, referralReward } from "@/lib/emails";
import { notifyTelegram, tg } from "@/lib/telegram";

type OrderItem = { name: string; title: string; qty: number; price: number };
type OrderForEmail = {
  id: string;
  order_number: string | null;
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
    const s = event.data.object;
    await notifyTelegram(
      `⌛ <b>Checkout abandoned</b> (payment page closed or timed out)${s.customer_details?.email ? ` · ${tg(s.customer_details.email)}` : ""} · ${tg(formatMyr((s.amount_total ?? 0) / 100))}`,
    );
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
    await notifyTelegram(`↩️ <b>Refund</b> ${tg(formatMyr(charge.amount_refunded / 100))}${charge.refunded ? " (full)" : " (partial)"} · ${tg(charge.billing_details?.email ?? "")}`);
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

    const codeDiscount = session.total_details?.amount_discount ?? 0;
    await supabase
      .from("orders")
      .update({ code_discount: codeDiscount / 100 })
      .eq("stripe_session_id", session.id);

    // Owner alert on Telegram: who bought what, and how it's going out.
    const { data: paid } = await supabase
      .from("orders")
      .select("order_number, customer_name, customer_phone, items, total, shipping_method, shipping_address")
      .eq("stripe_session_id", session.id)
      .single();
    if (paid) {
      const items = (paid.items as OrderItem[]).map((it) => `• ${tg(it.name)} (${tg(it.title)}) × ${it.qty}`).join("\n");
      const town = (paid.shipping_address as { city?: string } | null)?.city;
      await notifyTelegram(
        `🛒 <b>New order ${tg(paid.order_number)}</b> — ${tg(formatMyr(Number(paid.total)))}\n` +
          `${tg(paid.customer_name)} · ${tg(paid.customer_phone)}${customerEmail ? ` · ${tg(customerEmail)}` : ""}\n` +
          `${paid.shipping_method === "pickup" ? "Store pickup" : `${tg(paid.shipping_method)}${town ? ` to ${tg(town)}` : ""}`}\n${items}`,
      );
    }

    if (customerEmail) await supabase.rpc("mark_cart_recovered", { p_email: customerEmail });

    if (customerEmail) {
      try {
        const { data: order } = (await supabase
          .from("orders")
          .select("id, order_number, items, shipping_method, shipping_cost, total")
          .eq("stripe_session_id", session.id)
          .single()) as { data: OrderForEmail | null };
        if (order) {
          const ref = order.order_number ?? `#${order.id.slice(0, 8).toUpperCase()}`;
          const pickup = order.shipping_method === "pickup";
          const lines = order.items.map((it) => ({
            name: it.name,
            detail: `${it.title} × ${it.qty}`,
            amount: formatMyr(it.price * it.qty),
          }));
          if (order.shipping_method) {
            lines.push({
              name: pickup ? "Store pickup" : order.shipping_method === "lalamove" ? "Same-day delivery (Lalamove)" : "Courier delivery",
              detail: "",
              amount: Number(order.shipping_cost) > 0 ? formatMyr(Number(order.shipping_cost)) : "Free",
            });
          }
          await sendTemplate(customerEmail, orderConfirmed({ ref, pickup, lines, total: Number(order.total) }));
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
        await sendTemplate(referral.owner_email, referralReward(promo.code));
        await supabase.rpc("mark_referral_rewarded", { p_order_id: referral.order_id });
      }
    } catch (err) {
      console.error("Referral reward failed:", err);
    }
  }

  return NextResponse.json({ received: true });
}
