import { NextResponse } from "next/server";
import { sendTemplate } from "@/lib/resend";
import { createServiceClient } from "@/lib/supabase/service";
import { abandonedCart } from "@/lib/emails";
import { notifyTelegram } from "@/lib/telegram";

type CartItem = { name: string; title: string; qty: number; price: number };

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: carts, error } = await supabase.rpc("get_carts_to_remind");
  if (error) return NextResponse.json({ error: "Could not load carts" }, { status: 500 });

  let sent = 0;
  for (const cart of (carts ?? []) as { email: string; items: CartItem[]; subtotal: number }[]) {
    try {
      await sendTemplate(cart.email, abandonedCart(cart.items, cart.subtotal));
      await supabase.rpc("mark_cart_reminded", { p_email: cart.email });
      sent += 1;
    } catch (err) {
      console.error("Abandoned cart email failed:", cart.email, err);
    }
  }

  if (sent) await notifyTelegram(`🧺 <b>Cart reminders sent</b> to ${sent} shopper${sent === 1 ? "" : "s"} who left items in their cart.`);
  return NextResponse.json({ sent });
}
