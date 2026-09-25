import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
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
      await sendEmail(
        cart.email,
        `Your cart is saved — ${site.name}`,
        {
          preheader: "Your items are still waiting in your cart.",
          heading: "You left a few things in your cart",
          paragraphs: ["We've saved your cart so you can pick up where you left off."],
          lines: cart.items.map((it) => ({ name: it.name, detail: `${it.title} × ${it.qty}`, amount: formatMyr(it.price * it.qty) })),
          total: formatMyr(cart.subtotal),
          cta: { label: "Return to your cart", url: `${site.url}/cart` },
          note: "Need help choosing? Reply to this email or WhatsApp us and we'll help.",
        },
        { marketing: true },
      );
      await supabase.rpc("mark_cart_reminded", { p_email: cart.email });
      sent += 1;
    } catch (err) {
      console.error("Abandoned cart email failed:", cart.email, err);
    }
  }

  return NextResponse.json({ sent });
}
