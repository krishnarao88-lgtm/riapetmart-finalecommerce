import { NextResponse } from "next/server";
import { isValidSignature, parseWebhook, verifyChallenge } from "@/lib/whatsapp";

// Meta calls this once when the webhook is configured, to confirm we own the URL.
export async function GET(req: Request) {
  const challenge = verifyChallenge(new URL(req.url).searchParams, process.env.WHATSAPP_VERIFY_TOKEN);
  if (challenge === null) return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  return new Response(challenge, { headers: { "Content-Type": "text/plain" } });
}

// Incoming customer messages and delivery statuses.
export async function POST(req: Request) {
  const body = await req.text();
  if (!isValidSignature(body, req.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, statuses } = parseWebhook(payload);
  for (const m of messages) {
    console.log(`WhatsApp message from ${m.name ?? "unknown"} (${m.from}) [${m.type}]: ${m.text ?? ""}`);
  }
  for (const s of statuses) {
    if (s.status === "failed") console.error(`WhatsApp message ${s.id} to ${s.recipient} failed`);
  }

  return NextResponse.json({ received: true });
}
