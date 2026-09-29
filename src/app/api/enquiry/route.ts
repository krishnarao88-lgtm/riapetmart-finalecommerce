import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { site } from "@/lib/site";
import { notifyTelegram, tg } from "@/lib/telegram";

export async function POST(req: Request) {
  const { name, email, message } = (await req.json()) as { name?: string; email?: string; message?: string };
  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Fill in your name, a valid email, and a message" }, { status: 400 });
  }

  try {
    await getResend().emails.send({
      // Fixed verified sending domain (the site itself lives on www, which Resend hasn't verified).
      from: `${site.name} website <enquiry@riapetmart.com>`,
      to: site.email,
      replyTo: email,
      subject: `New enquiry from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });
  } catch (err) {
    console.error("Enquiry email failed:", err);
    return NextResponse.json({ error: "Could not send your message. Try WhatsApp instead." }, { status: 500 });
  }

  await notifyTelegram(`✉️ <b>Website enquiry</b> from ${tg(name)} (${tg(email)})\n${tg(message.slice(0, 500))}`);
  return NextResponse.json({ ok: true });
}
