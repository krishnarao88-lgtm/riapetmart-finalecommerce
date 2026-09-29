import { NextResponse } from "next/server";
import { sendTemplate } from "@/lib/resend";
import { site } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";
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

  return NextResponse.json({ sent, reviewsRequested });
}
