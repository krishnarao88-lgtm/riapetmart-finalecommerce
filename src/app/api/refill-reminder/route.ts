import { NextResponse } from "next/server";
import { normalisePhone } from "@/lib/meta-capi";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyTelegram, tg } from "@/lib/telegram";

const MY_MOBILE = /^(?:\+?60|0)1\d{8,9}$/;
const WEEKS = new Set([2, 3, 4, 6]);

/** Product page → "Remind me on WhatsApp before it runs out". */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    productId?: string;
    weeks?: number;
    website?: string; // honeypot: humans never see or fill it
  };
  if (body.website) return NextResponse.json({ ok: true });

  const name = String(body.name ?? "").trim().slice(0, 60);
  const rawPhone = String(body.phone ?? "").replace(/[\s-]/g, "");
  const weeks = Number(body.weeks);
  if (!name || !MY_MOBILE.test(rawPhone) || !WEEKS.has(weeks)) {
    return NextResponse.json({ error: "Enter your name and a Malaysian mobile number" }, { status: 400 });
  }
  const phone = normalisePhone(rawPhone);

  const supabase = createServiceClient();
  // Name and link come from the database, never from the browser.
  const { data: product } = await supabase
    .from("products")
    .select("id, name, slug")
    .eq("id", String(body.productId ?? ""))
    .eq("status", "published")
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 400 });

  // A handful of pending reminders per number is plenty; stops one number flooding the owner's Telegram.
  const { count } = await supabase
    .from("refill_reminders")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .is("sent_at", null);
  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "You already have 5 reminders waiting. We'll be in touch!" }, { status: 429 });
  }

  const remindOn = new Date(Date.now() + 8 * 3_600_000 + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
  const { error } = await supabase.from("refill_reminders").insert({
    name,
    phone,
    product_id: product.id,
    product_name: product.name,
    product_slug: product.slug,
    remind_on: remindOn,
  });
  if (error) return NextResponse.json({ error: "Could not save your reminder" }, { status: 500 });

  await notifyTelegram(`🔔 <b>Refill reminder set</b> — ${tg(name)} · +${tg(phone)}\n${tg(product.name)} · remind on ${tg(remindOn)}`);
  return NextResponse.json({ ok: true, remindOn });
}
