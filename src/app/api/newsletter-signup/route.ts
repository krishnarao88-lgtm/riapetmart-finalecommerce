import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
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
    await sendEmail(email, `Your 10% welcome code — ${site.name}`, {
      preheader: "Here's 10% off your first order.",
      heading: `Welcome to ${site.name}`,
      paragraphs: ["Thanks for joining us. Here's 10% off your first order: food, treats, litter and care for your pets, with same-day delivery around Rawang, Selangor and KL."],
      code,
      cta: { label: "Start shopping", url: `${site.url}/shop` },
      note: "Enter the code at the payment step. It works once.",
    });
  } catch (err) {
    console.error("Welcome code email failed:", err);
  }

  return NextResponse.json({ code });
}
