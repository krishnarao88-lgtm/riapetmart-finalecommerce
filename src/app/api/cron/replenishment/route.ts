import { NextResponse } from "next/server";
import { sendTemplate } from "@/lib/resend";
import { site } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyTelegram, tg } from "@/lib/telegram";
import { restockReminder, reviewRequest } from "@/lib/emails";

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
      await sendTemplate(order.email, restockReminder(order.items));
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
      await sendTemplate(order.email, reviewRequest(link));
      await supabase.rpc("mark_review_requested", { p_order_id: order.order_id });
      reviewsRequested += 1;
    } catch (err) {
      console.error("Review request email failed:", order.order_id, err);
    }
  }

  // WhatsApp refill reminders due today (Malaysia date): the owner gets a one-tap link with the message written.
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  const { data: due } = await supabase
    .from("refill_reminders")
    .select("id, name, phone, product_name, product_slug")
    .is("sent_at", null)
    .lte("remind_on", today)
    .limit(30);
  for (const r of due ?? []) {
    const text = `Hi ${r.name}, Ria Pet Mart here 🐾 You asked us to remind you about ${r.product_name}. Running low? Reply YES and we'll deliver today, or order here: ${site.url}/shop/${r.product_slug}`;
    const link = `https://wa.me/${r.phone}?text=${encodeURIComponent(text)}`;
    await notifyTelegram(
      `🔔 <b>Refill reminder due</b> — ${tg(r.name)} · +${tg(r.phone)}\n${tg(r.product_name)}\n<a href="${tg(link)}">Tap to send the WhatsApp message</a>`,
    );
    await supabase.from("refill_reminders").update({ sent_at: new Date().toISOString() }).eq("id", r.id);
  }

  return NextResponse.json({ sent, reviewsRequested, refillReminders: (due ?? []).length });
}
