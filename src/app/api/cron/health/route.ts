import { NextResponse } from "next/server";
import { getVariantStock } from "@/components/product-card";
import { site } from "@/lib/site";
import { getEasyParcelQuote } from "@/lib/shipping/easyparcel";
import { getLalamoveQuote, LALAMOVE_LIVE } from "@/lib/shipping/lalamove";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyTelegram, tg } from "@/lib/telegram";

export const maxDuration = 60;

type Check = { area: string; name: string; ok: boolean; detail?: string };

async function page(path: string, mustContain?: string): Promise<{ ok: boolean; detail: string; html: string }> {
  try {
    const started = Date.now();
    const res = await fetch(`${site.url}${path}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const html = await res.text();
    const ms = Date.now() - started;
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}`, html };
    if (mustContain && !html.includes(mustContain)) return { ok: false, detail: `"${mustContain}" missing`, html };
    return { ok: ms < 8000, detail: ms < 8000 ? `${ms} ms` : `slow: ${ms} ms`, html };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "no response", html: "" };
  }
}

/** Runs one check; a returned string starting with "!" is a failure with that message. */
async function run(area: string, name: string, fn: () => Promise<true | string>): Promise<Check> {
  try {
    const r = await fn();
    if (r === true) return { area, name, ok: true };
    return { area, name, ok: !r.startsWith("!"), detail: r.replace(/^!/, "") };
  } catch (err) {
    return { area, name, ok: false, detail: err instanceof Error ? err.message.slice(0, 120) : "failed" };
  }
}

/**
 * Daily 8:30am MYT check of everything the shop depends on: the customer journey pages and buttons,
 * delivery quotes, payments, tracking tags, feeds and the order queue. Read-only; results go to Telegram.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const checks: Check[] = [];

  // 1. Customer journey: the pages a shopper goes through, and the key button or text on each.
  const home = await page("/", "Shop all");
  checks.push({ area: "Journey", name: "Homepage", ok: home.ok, detail: home.detail });
  for (const [path, text, name] of [
    ["/shop", "Add", "Shop grid"],
    ["/cart", "cart", "Cart page"],
    ["/account/login", "password", "Customer login"],
    ["/vets", "Find a vet near me", "Vet finder"],
    ["/contact", "WhatsApp", "Contact page"],
  ] as const) {
    const r = await page(path, text);
    checks.push({ area: "Journey", name, ok: r.ok, detail: r.detail });
  }

  // The product feed (Google Shopping + Meta catalogue); its first in-stock item must show "Add to cart".
  const feed = await page("/feed.xml", "<item>");
  const items = (feed.html.match(/<item>/g) ?? []).length;
  const inStock = (feed.html.match(/in_stock/g) ?? []).length;
  checks.push({ area: "Ads & SEO", name: "Product feed (Google / Meta)", ok: feed.ok && items > 0, detail: `${items} items, ${inStock} in stock` });
  const link = feed.html
    .split("<item>")
    .slice(1)
    .find((i) => i.includes("in_stock"))
    ?.match(/<link>([^<]+)<\/link>/)?.[1];
  if (link) {
    const r = await page(new URL(link).pathname, "Add to cart");
    checks.push({ area: "Journey", name: "Product page + Add to cart", ok: r.ok, detail: r.detail });
  } else {
    checks.push({ area: "Journey", name: "Product page + Add to cart", ok: false, detail: "no in-stock product in the feed" });
  }
  const sitemap = await page("/sitemap.xml", "<loc>");
  checks.push({ area: "Ads & SEO", name: "Sitemap", ok: sitemap.ok, detail: `${(sitemap.html.match(/<loc>/g) ?? []).length} pages` });

  // 2. Tracking tags on the live homepage, and server-side purchase tracking.
  checks.push({ area: "Ads & SEO", name: "Google tag GT-PLWBKDKZ", ok: home.html.includes("GT-PLWBKDKZ") });
  checks.push({ area: "Ads & SEO", name: "Meta Pixel", ok: !!process.env.NEXT_PUBLIC_META_PIXEL_ID && home.html.includes("fbq('init'") });
  checks.push({ area: "Ads & SEO", name: "Meta server-side purchases", ok: !!process.env.META_CAPI_TOKEN, detail: process.env.META_CAPI_TOKEN ? undefined : "META_CAPI_TOKEN missing" });

  // 3. Money and delivery: real quotes (free, nothing booked) and Stripe in live mode.
  checks.push(
    await run("Delivery", "Lalamove same-day quote (Rawang)", async () => {
      if (!LALAMOVE_LIVE) return "!still in sandbox mode";
      const q = await getLalamoveQuote("Jalan Bandar Rawang 2, 48000 Rawang, Selangor, Malaysia", 1);
      return q ? `RM ${q.price.toFixed(2)}` : "!no quote";
    }),
    await run("Delivery", "EasyParcel courier quote (Penang)", async () => {
      const q = await getEasyParcelQuote("10050", "Penang", 1);
      return q ? `RM ${q.price.toFixed(2)} ${q.courierName}` : "!no quote: reconnect EasyParcel in Admin → Settings";
    }),
    await run("Payments", "Stripe live mode", async () => ((await getStripe().balance.retrieve()).livemode ? "live" : "!TEST mode")),
    await run("Messages", "Order emails (Resend)", async () => (process.env.RESEND_API_KEY ? true : "!RESEND_API_KEY missing")),
  );

  // 4. The shop's own queue: things that need a person.
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [stuck, courier, weekly, published] = await Promise.all([
    supabase.from("orders").select("order_number").eq("status", "paid").eq("is_test", false).in("fulfilment_status", ["new", "packed"]).lt("created_at", dayAgo),
    supabase.from("orders").select("order_number").eq("is_test", false).in("easyparcel_status_code", [0, 6, 8]).not("fulfilment_status", "in", "(cancelled,refunded,delivered)"),
    supabase.from("site_reports").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("products").select("id, variants(id)").eq("status", "published"),
  ]);
  const stuckList = (stuck.data ?? []).map((o) => o.order_number).join(", ");
  checks.push({ area: "Orders", name: "Paid orders waiting over 24h", ok: !stuckList, detail: stuckList || "none" });
  const courierList = (courier.data ?? []).map((o) => o.order_number).join(", ");
  checks.push({ area: "Orders", name: "Courier problems (cancelled / returned / on hold)", ok: !courierList, detail: courierList || "none" });

  const products = (published.data ?? []) as { id: string; variants: { id: string }[] }[];
  const stock = await getVariantStock(supabase, products.flatMap((p) => p.variants.map((v) => v.id)));
  const empty = stock ? products.filter((p) => p.variants.every((v) => (stock.get(v.id)?.available ?? 0) <= 0)).length : null;
  checks.push({
    area: "Stock",
    name: "Published products out of stock",
    ok: empty !== null && empty <= products.length * 0.25,
    detail: empty === null ? "stock lookup failed" : `${empty} of ${products.length}`,
  });

  const lastReport = weekly.data?.created_at ? Date.parse(weekly.data.created_at) : 0;
  const firstDue = Date.parse("2026-10-06T00:00:00Z");
  checks.push({
    area: "Automation",
    name: "Weekly improvement report",
    ok: Date.now() < firstDue || Date.now() - lastReport < 8 * 86_400_000,
    detail: lastReport ? `last ${new Date(lastReport).toISOString().slice(0, 10)}` : "first one due Mon 5 Oct",
  });

  const failed = checks.filter((c) => !c.ok);
  const line = (c: Check) => `${c.ok ? "✅" : "❌"} ${tg(c.name)}${c.detail ? `: ${tg(c.detail)}` : ""}`;
  await notifyTelegram(
    [
      failed.length ? `🩺 <b>Daily health check: ${failed.length} need attention</b>` : `🩺 <b>Daily health check: all ${checks.length} good</b>`,
      ...(failed.length ? ["", ...failed.map(line)] : []),
      "",
      ...checks.filter((c) => c.ok).map(line),
      "",
      `Admin: ${site.url}/admin`,
    ].join("\n"),
  );
  return NextResponse.json({ ok: failed.length === 0, failed: failed.length, checks });
}
