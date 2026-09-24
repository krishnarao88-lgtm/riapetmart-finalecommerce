import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { formatMyr } from "@/lib/pricing";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

type OrderItem = { name: string; title: string; qty: number; price: number };

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: orders, error } = await supabase.rpc("get_orders_to_replenish");
  if (error) return NextResponse.json({ error: "Could not load orders" }, { status: 500 });

  let sent = 0;
  for (const order of (orders ?? []) as { order_id: string; email: string; items: OrderItem[]; subtotal: number }[]) {
    try {
      const lines = order.items.map((it) => `${it.name} (${it.title}) x${it.qty}`).join("\n");
      await getResend().emails.send({
        from: `${site.name} <orders@${new URL(site.url).hostname}>`,
        to: order.email,
        subject: "Running low? Time to restock 🐾",
        text: `It's been about a month since your last order — most food and litter runs out around now.\n\nYour last order:\n${lines}\n\nReorder in a couple of taps: ${site.url}/shop\n\n${site.name}\n${site.phone}`,
      });
      await supabase.rpc("mark_order_replenished", { p_order_id: order.order_id });
      sent += 1;
    } catch (err) {
      console.error("Replenishment email failed:", order.order_id, err);
    }
  }

  return NextResponse.json({ sent });
}
