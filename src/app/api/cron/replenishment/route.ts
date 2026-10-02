import { NextResponse } from "next/server";
import { sendTemplate } from "@/lib/resend";
import { site } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyTelegram, tg } from "@/lib/telegram";
import { restockReminder, reviewRequest, welcomeBestSellers, welcomeGuide } from "@/lib/emails";
import { titleCase } from "@/lib/seo";

type OrderItem = { name: string; title: string; qty: number; price: number };

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: orders, error } = await supabase.rpc("get_orders_to_replenish");
  if (error) return NextResponse.json({ error: "Could not load orders" }, { status: 500 });

  let sent = 0;
  for (const order of (orders ?? []) as { order_id: string; email: string; items: OrderItem[]; subtotal: number }[]) {
    try {
      await sendTemplate(order.email, restockReminder(order.items));
      await supabase.rpc("mark_order_replenished", { p_order_id: order.order_id });
      sent += 1;
    } catch (err) {
      console.error("Replenishment email failed:", order.order_id, err);
    }
  }

  const { data: reviewOrders } = await supabase.rpc("get_orders_to_request_review");
  let reviewsRequested = 0;
  for (const order of (reviewOrders ?? []) as { order_id: string; email: string }[]) {
    try {
      const link = `${site.url}/reviews/new?order=${order.order_id}&email=${encodeURIComponent(order.email)}`;
      await sendTemplate(order.email, reviewRequest(link));
      await supabase.rpc("mark_review_requested", { p_order_id: order.order_id });
      reviewsRequested += 1;
    } catch (err) {
      console.error("Review request email failed:", order.order_id, err);
    }
  }

  // WhatsApp refill reminders due today (Malaysia date): the owner gets a one-tap link with the message written.
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  const { data: due } = await supabase
    .from("refill_reminders")
    .select("id, name, phone, product_name, product_slug")
    .is("sent_at", null)
    .lte("remind_on", today)
    .limit(30);
  for (const r of due ?? []) {
    const text = `Hi ${r.name}, Ria Pet Mart here 🐾 You asked us to remind you about ${r.product_name}. Running low? Reply YES and we'll deliver today, or order here: ${site.url}/shop/${r.product_slug}`;
    const link = `https://wa.me/${r.phone}?text=${encodeURIComponent(text)}`;
    await notifyTelegram(
      `🔔 <b>Refill reminder due</b> — ${tg(r.name)} · +${tg(r.phone)}\n${tg(r.product_name)}\n<a href="${tg(link)}">Tap to send the WhatsApp message</a>`,
    );
    await supabase.from("refill_reminders").update({ sent_at: new Date().toISOString() }).eq("id", r.id);
  }

  const welcome = await sendWelcomeSeries(supabase);
  return NextResponse.json({ sent, reviewsRequested, refillReminders: (due ?? []).length, welcome });
}

/** Welcome series emails 2 (day 3) and 3 (day 7) to newsletter sign-ups who haven't ordered yet. */
async function sendWelcomeSeries(supabase: ReturnType<typeof createServiceClient>) {
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
  const [{ data: due2 }, { data: due3 }, { data: buyers }] = await Promise.all([
    supabase.from("newsletter_signups").select("id, email").is("welcome2_sent_at", null).lte("created_at", daysAgo(3)).gte("created_at", daysAgo(30)).limit(50),
    supabase.from("newsletter_signups").select("id, email").is("welcome3_sent_at", null).not("welcome2_sent_at", "is", null).lte("created_at", daysAgo(7)).gte("created_at", daysAgo(30)).limit(50),
    supabase.from("orders").select("customer_email").eq("status", "paid").eq("is_test", false),
  ]);
  const ordered = new Set((buyers ?? []).map((o) => String(o.customer_email ?? "").toLowerCase()));
  let sent = 0;

  // Day 3, or skipped (marked sent) once they've ordered, so the series stops for customers.
  for (const s of due2 ?? []) {
    const isCustomer = ordered.has(s.email.toLowerCase());
    if (!isCustomer) await sendTemplate(s.email, welcomeGuide()).catch((err) => console.error("Welcome 2 failed:", err));
    await supabase.from("newsletter_signups").update({ welcome2_sent_at: new Date().toISOString() }).eq("id", s.id);
    if (!isCustomer) sent += 1;
  }

  if (due3?.length) {
    // Top 3 products by units sold in real orders.
    const { data: orders } = await supabase.from("orders").select("items").eq("status", "paid").eq("is_test", false).limit(500);
    const units = new Map<string, number>();
    for (const o of orders ?? []) for (const it of (o.items ?? []) as { variant_id: string; qty: number }[]) units.set(it.variant_id, (units.get(it.variant_id) ?? 0) + it.qty);
    const topIds = [...units].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 10);
    const { data: variants } = topIds.length
      ? await supabase.from("variants").select("id, products(name, slug, status)").in("id", topIds)
      : { data: [] };
    const seen = new Set<string>();
    const products = topIds
      .map((id) => (variants ?? []).find((v) => v.id === id)?.products as unknown as { name: string; slug: string; status: string } | null)
      .filter((p): p is { name: string; slug: string; status: string } => !!p && p.status === "published" && !seen.has(p.slug) && !!seen.add(p.slug))
      .slice(0, 3)
      .map((p) => ({ name: titleCase(p.name), url: `${site.url}/shop/${p.slug}` }));

    for (const s of due3) {
      const isCustomer = ordered.has(s.email.toLowerCase());
      if (!isCustomer) await sendTemplate(s.email, welcomeBestSellers(products)).catch((err) => console.error("Welcome 3 failed:", err));
      await supabase.from("newsletter_signups").update({ welcome3_sent_at: new Date().toISOString() }).eq("id", s.id);
      if (!isCustomer) sent += 1;
    }
  }
  return sent;
}
