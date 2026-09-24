import { NextResponse } from "next/server";
import { FROM, getResend } from "@/lib/resend";
import { formatMyr } from "@/lib/pricing";
import { site } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";

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
      const lines = cart.items.map((it) => `${it.name} (${it.title}) x${it.qty}`).join("\n");
      await getResend().emails.send({
        from: FROM,
        to: cart.email,
        subject: "You left something in your cart 🐾",
        text: `Still thinking it over?\n\n${lines}\n\nTotal: ${formatMyr(cart.subtotal)}\n\nCome back and finish your order: ${site.url}/cart\n\n${site.name}\n${site.phone}`,
      });
      await supabase.rpc("mark_cart_reminded", { p_email: cart.email });
      sent += 1;
    } catch (err) {
      console.error("Abandoned cart email failed:", cart.email, err);
    }
  }

  return NextResponse.json({ sent });
}
