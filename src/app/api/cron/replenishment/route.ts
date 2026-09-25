import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { site } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";

type OrderItem = { name: string; title: string; qty: number; price: number };

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: orders, error } = await supabase.rpc("get_orders_to_replenish");
  if (error) return NextResponse.json({ error: "Could not load orders" }, { status: 500 });

  let sent = 0;
  for (const order of (orders ?? []) as { order_id: string; email: string; items: OrderItem[]; subtotal: number }[]) {
    try {
      await sendEmail(
        order.email,
        `Time to restock? — ${site.name}`,
        {
          preheader: "It's been about a month since your last order.",
          heading: "Running low on anything?",
          paragraphs: ["It's been about a month since your last order, which is usually when food and litter start running out. Here's what you had last time:"],
          lines: order.items.map((it) => ({ name: it.name, detail: `${it.title} × ${it.qty}` })),
          cta: { label: "Reorder now", url: `${site.url}/shop` },
          note: "Prefer to order on WhatsApp? Reply to this email or message us and we'll sort it.",
        },
        { marketing: true },
      );
      await supabase.rpc("mark_order_replenished", { p_order_id: order.order_id });
      sent += 1;
    } catch (err) {
      console.error("Replenishment email failed:", order.order_id, err);
    }
  }

  const { data: reviewOrders } = await supabase.rpc("get_orders_to_request_review");
  let reviewsRequested = 0;
  for (const order of (reviewOrders ?? []) as { order_id: string; email: string }[]) {
    try {
      const link = `${site.url}/reviews/new?order=${order.order_id}&email=${encodeURIComponent(order.email)}`;
      await sendEmail(
        order.email,
        `How was your order? — ${site.name}`,
        {
          preheader: "A quick review helps other pet owners choose.",
          heading: "How is your pet enjoying it?",
          paragraphs: [
            "We hope your last order went down well. If you have a minute, an honest review helps other pet owners in Malaysia choose the right food and care.",
          ],
          cta: { label: "Write a quick review", url: link },
          note: "It takes about a minute. Thank you!",
        },
        { marketing: true },
      );
      await supabase.rpc("mark_review_requested", { p_order_id: order.order_id });
      reviewsRequested += 1;
    } catch (err) {
      console.error("Review request email failed:", order.order_id, err);
    }
  }

  return NextResponse.json({ sent, reviewsRequested });
}
