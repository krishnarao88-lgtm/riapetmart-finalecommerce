import { NextResponse } from "next/server";
import { orderProfit, type ProfitOrder } from "@/lib/finance";
import { formatMyr } from "@/lib/pricing";
import { site } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyTelegram, tg } from "@/lib/telegram";

type Row = { product_id: string; products: { name: string } | null };

/** Top N product names by how often they appear. */
function top(rows: Row[], n: number) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const name = r.products?.name;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** 9pm Malaysia time: one Telegram message with the whole day's activity (Vercel cron, see vercel.json). */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  // Start of today in Malaysia (UTC+8).
  const kl = new Date(Date.now() + 8 * 3_600_000);
  const since = new Date(Date.UTC(kl.getUTCFullYear(), kl.getUTCMonth(), kl.getUTCDate()) - 8 * 3_600_000).toISOString();

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [orders, pending, accounts, signups, hotel, carts, views, adds, week] = await Promise.all([
    supabase.from("orders").select("order_number, customer_name, total").eq("status", "paid").eq("is_test", false).gte("created_at", since),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending").eq("is_test", false).gte("created_at", since),
    supabase.from("profiles").select("email").eq("role", "customer").gte("created_at", since),
    supabase.from("newsletter_signups").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("cat_hotel_bookings").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("abandoned_carts").select("subtotal").eq("recovered", false).gte("created_at", since),
    supabase.from("product_views").select("product_id, products(name)").gte("viewed_at", since),
    supabase.from("cart_adds").select("product_id, products(name)").gte("created_at", since),
    supabase
      .from("orders")
      .select("created_at, total, shipping_cost, code_discount, refunded_amount, shipping_method, courier_cost, items")
      .eq("status", "paid")
      .eq("is_test", false)
      .gte("created_at", weekAgo),
  ]);

  // Per-order profit (Admin → Orders shows the breakdown): today's total, and delivery covered over 7 days.
  const weekOrders = (week.data ?? []) as unknown as (ProfitOrder & { created_at: string })[];
  const variantIds = [...new Set(weekOrders.flatMap((o) => o.items.map((i) => i.variant_id)))];
  const { data: costRows } = variantIds.length
    ? await supabase.from("variant_costs").select("variant_id, cost_price").in("variant_id", variantIds)
    : { data: [] };
  const costs = new Map((costRows ?? []).map((c) => [c.variant_id as string, Number(c.cost_price)]));
  const profits = weekOrders.map((o) => ({ today: o.created_at >= since, ...orderProfit(o, costs) }));
  const todayProfit = profits.filter((p) => p.today).reduce((s, p) => s + p.profit, 0);
  const weekCovered = profits.reduce((s, p) => s + p.deliveryCovered, 0);
  const estimated = profits.some((p) => p.today && (p.courierEstimated || p.costMissing > 0));

  const paid = orders.data ?? [];
  const revenue = paid.reduce((s, o) => s + Number(o.total), 0);
  const viewRows = (views.data ?? []) as unknown as Row[];
  const addRows = (adds.data ?? []) as unknown as Row[];
  const cartValue = (carts.data ?? []).reduce((s, c) => s + Number(c.subtotal), 0);
  const list = (rows: [string, number][]) => rows.map(([name, n]) => `  ${n}× ${tg(name)}`).join("\n") || "  —";

  await notifyTelegram(
    [
      `📊 <b>${tg(site.name)} — today</b>`,
      "",
      `🛒 <b>Orders paid:</b> ${paid.length} · ${tg(formatMyr(revenue))}`,
      ...paid.map((o) => `  ${tg(o.order_number)} · ${tg(o.customer_name)} · ${tg(formatMyr(Number(o.total)))}`),
      `💰 <b>Profit today:</b> ${tg(formatMyr(todayProfit))}${estimated ? " (estimate — some couriers not booked yet)" : ""}`,
      `🚚 Delivery you covered, last 7 days: ${tg(formatMyr(weekCovered))}`,
      `⏳ Checkouts started but not paid: ${pending.count ?? 0}`,
      `🧺 Carts left with an email: ${(carts.data ?? []).length} (${tg(formatMyr(cartValue))})`,
      "",
      `👤 New accounts: ${(accounts.data ?? []).length}`,
      `🎁 Newsletter sign-ups: ${signups.count ?? 0}`,
      `🐱 Cat Hotel requests: ${hotel.count ?? 0}`,
      "",
      `👀 <b>Product page views:</b> ${viewRows.length}`,
      list(top(viewRows, 5)),
      `➕ <b>Added to cart:</b> ${addRows.length}`,
      list(top(addRows, 5)),
      "",
      "Visitor numbers and where they came from: Google Analytics → Reports → Realtime / Acquisition.",
      `Admin: ${site.url}/admin`,
    ].join("\n"),
  );
  return NextResponse.json({ ok: true, orders: paid.length });
}
