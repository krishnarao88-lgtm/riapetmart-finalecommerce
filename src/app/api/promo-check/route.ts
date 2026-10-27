import { NextResponse } from "next/server";
import { parseLines, priceCart } from "@/lib/cart-pricing";
import { CODES_NOT_ON_SALE, resolvePromoCode } from "@/lib/promo-code";
import { allow, clientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { readWelcomeOffer } from "@/lib/welcome-offer";

/** Checks a welcome/discount code against the current cart so the cart can show the saving before payment. */
export async function POST(req: Request) {
  if (!allow(`promo:${clientIp(req)}`, 20)) {
    return NextResponse.json({ error: "Too many tries. Please wait a few minutes and try again." }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { code?: unknown; lines?: unknown };
  const lines = parseLines(body.lines);
  if (!lines) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });

  const [cart, offer] = await Promise.all([priceCart(await createClient(), lines), readWelcomeOffer()]);
  if ("error" in cart) return NextResponse.json({ error: cart.error }, { status: 400 });
  if (!offer.stack_with_discounts && cart.items.some((it) => it.discount)) {
    return NextResponse.json({ error: CODES_NOT_ON_SALE }, { status: 400 });
  }

  const promo = await resolvePromoCode(String(body.code ?? ""));
  if (!promo.ok) return NextResponse.json({ error: promo.error }, { status: 400 });
  if (promo.minimum && cart.subtotal < promo.minimum) {
    return NextResponse.json({ error: `This code needs an order of at least RM${promo.minimum.toFixed(2)}.` }, { status: 400 });
  }
  return NextResponse.json({ code: promo.code, percentOff: promo.percentOff, amountOff: promo.amountOff });
}
