import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { sendTemplate } from "@/lib/resend";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { readWelcomeOffer } from "@/lib/welcome-offer";
import { welcomeCode } from "@/lib/emails";
import { notifyTelegram, tg } from "@/lib/telegram";

/** One Stripe coupon per percentage (welcome10, welcome15…), created the first time it's needed. */
async function welcomeCoupon(percent: number): Promise<string> {
  const id = `welcome${percent}`;
  const stripe = getStripe();
  try {
    await stripe.coupons.retrieve(id);
  } catch {
    await stripe.coupons.create({ id, percent_off: percent, duration: "once", name: `Welcome ${percent}% off` });
  }
  return id;
}

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const offer = await readWelcomeOffer();
  if (!offer.enabled) return NextResponse.json({ error: "This offer has ended" }, { status: 410 });

  const { error } = await createServiceClient().rpc("add_newsletter_signup", { p_email: email });
  if (error) return NextResponse.json({ error: "Could not save your email" }, { status: 500 });

  let code: string;
  try {
    const promo = await getStripe().promotionCodes.create({
      promotion: { type: "coupon", coupon: await welcomeCoupon(offer.percent) },
      max_redemptions: 1,
      code: `WELCOME-${randomBytes(4).toString("hex").toUpperCase()}`,
    });
    code = promo.code;
  } catch (err) {
    console.error("Welcome promotion code failed:", err);
    return NextResponse.json({ error: "Could not create your code — please try again" }, { status: 500 });
  }

  try {
    await sendTemplate(email, welcomeCode(offer.percent, code));
  } catch (err) {
    console.error("Welcome code email failed:", err);
  }

  await notifyTelegram(`🎁 <b>New newsletter sign-up</b>: ${tg(email)} (got code ${tg(code)})`);
  return NextResponse.json({ code });
}
