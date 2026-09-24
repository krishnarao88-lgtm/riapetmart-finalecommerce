import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { FROM, getResend } from "@/lib/resend";
import { site } from "@/lib/site";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const { error } = await createServiceClient().rpc("add_newsletter_signup", { p_email: email });
  if (error) return NextResponse.json({ error: "Could not save your email" }, { status: 500 });

  let code: string;
  try {
    const promo = await getStripe().promotionCodes.create({
      promotion: { type: "coupon", coupon: "welcome10" },
      max_redemptions: 1,
      code: `WELCOME-${randomBytes(4).toString("hex").toUpperCase()}`,
    });
    code = promo.code;
  } catch (err) {
    console.error("Welcome promotion code failed:", err);
    return NextResponse.json({ error: "Could not create your code — please try again" }, { status: 500 });
  }

  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Your 10% off code for ${site.name} 🐾`,
      text: `Welcome to ${site.name}!\n\nYour code: ${code}\n\nEnter it at the payment step for 10% off your first order. It works once.\n\nShop now: ${site.url}/shop\n\n${site.name}\n${site.phone}`,
    });
  } catch (err) {
    console.error("Welcome code email failed:", err);
  }

  return NextResponse.json({ code });
}
