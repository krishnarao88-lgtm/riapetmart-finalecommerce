import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { moneySummary, productScenarios, type FinanceOrder, type Scenario } from "@/lib/finance";
import { formatMyr } from "@/lib/pricing";
import { promoFor, type Promotion } from "@/lib/promotions";
import { toWelcomeOffer } from "@/lib/welcome-offer";

export const metadata: Metadata = { title: "Finance", robots: { index: false } };

const PERIODS = [
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 365, label: "Last 12 months" },
];

type Variant = { id: string; title: string; price: number; variant_costs: { cost_price: number } | null };
type Product = {
  id: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  brands: { is_house_brand: boolean } | null;
  variants: Variant[];
};

/** Start of the period, and today's date in Malaysia (UTC+8). */
function periodStart(days: number) {
  const now = new Date().getTime();
  return {
    since: new Date(now - days * 86_400_000).toISOString(),
    today: new Date(now + 8 * 3_600_000).toISOString().slice(0, 10),
  };
}

function Tile({ label, value, tone, note }: { label: string; value: number; tone?: "bad" | "ok"; note?: string }) {
  const color = tone === "bad" ? "text-bad-fg" : tone === "ok" ? "text-ok-fg" : "text-ink";
  return (
    <div className="grid gap-0.5 rounded-2xl border-2 border-line bg-surface p-4">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-2">{label}</span>
      <span className={`text-xl font-extrabold tabular-nums ${color}`}>{formatMyr(value)}</span>
      {note && <span className="text-xs text-ink-2">{note}</span>}
    </div>
  );
}

export default async function FinancePage({ searchParams }: PageProps<"/admin/finance">) {
  const { days: daysParam, all } = await searchParams;
  const days = PERIODS.find((p) => String(p.days) === daysParam)?.days ?? 30;
  const showAll = all === "1";
  const { supabase } = await requireAdmin();
  const { since, today } = periodStart(days);

  const [{ data: orderRows }, { data: productRows }, { data: bundleRows }, { data: promoRows }, { data: settingRows }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("total, shipping_cost, code_discount, items")
        .eq("status", "paid")
        .gte("created_at", since),
      supabase
        .from("products")
        .select("id, name, brand_id, category_id, brands(is_house_brand), variants(id, title, price, variant_costs(cost_price))")
        .eq("status", "published")
        .order("name"),
      supabase.from("bundle_offers").select("product_id, discount").eq("approved", true),
      supabase.from("promotions").select("*").eq("is_active", true).gte("ends_on", today),
      supabase.from("settings").select("key, value").in("key", ["expiry_badges", "welcome_offer", "delivery"]),
    ]);

  const settings = new Map((settingRows ?? []).map((r) => [r.key, r.value as Record<string, unknown>]));
  const clearance = ((settings.get("expiry_badges")?.short_dated as { discount: number }[] | undefined) ?? [])
    .map((t) => Number(t.discount))
    .sort((a, b) => a - b);
  const welcome = toWelcomeOffer(settings.get("welcome_offer"));
  const cap = settings.get("delivery")?.free_delivery_cap as number | null | undefined;
  const bundles = new Map((bundleRows ?? []).map((b) => [b.product_id as string, Number(b.discount)]));
  const promos = (promoRows ?? []).map((p) => ({ ...p, discount: Number(p.discount) })) as Promotion[];

  // ---- Money in and out over the period
  const orders = (orderRows ?? []) as unknown as FinanceOrder[];
  const products = (productRows ?? []) as unknown as Product[];
  const costs = new Map<string, number>();
  for (const p of products) for (const v of p.variants) if (v.variant_costs) costs.set(v.id, Number(v.variant_costs.cost_price));
  const money = moneySummary(orders, costs);
  const discountTotal = money.discounts.clearance + money.discounts.bundle + money.discounts.sale + money.codes;

  // ---- Per-item margins under every discount
  type Row = { product: string; variant: string; cost: number; rows: Scenario[]; worst: Scenario };
  const items: Row[] = [];
  for (const p of products) {
    const target = { id: p.id, brand_id: p.brand_id, category_id: p.category_id, house: p.brands?.is_house_brand ?? false };
    // The biggest sale that will cover this product, running now or scheduled later.
    const sale = Math.max(0, ...promos.map((promo) => promoFor(target, [promo], promo.starts_on < today ? today : promo.starts_on)?.discount ?? 0));
    for (const v of p.variants) {
      if (!v.variant_costs || Number(v.price) <= 0) continue;
      const cost = Number(v.variant_costs.cost_price);
      const rows = productScenarios(Number(v.price), cost, {
        clearance,
        bundle: bundles.get(p.id) ?? null,
        sale: sale || null,
        welcome: welcome.enabled ? welcome.percent / 100 : null,
      });
      items.push({ product: p.name, variant: v.title, cost, rows, worst: rows.reduce((a, b) => (b.profit < a.profit ? b : a)) });
    }
  }
  items.sort((a, b) => a.worst.margin - b.worst.margin);
  const losing = items.filter((i) => i.worst.profit < 0);
  const shown = showAll ? items : losing;
  const avgMargin = items.length ? items.reduce((s, i) => s + i.rows[0].margin, 0) / items.length : 0;
  const link = (q: Record<string, string | number | undefined>) =>
    `/admin/finance?${new URLSearchParams(
      Object.entries({ days, all: showAll ? "1" : undefined, ...q })
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    )}`;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Finance</h1>
        <p className="text-ink-2">
          What the shop is making and what discounts cost you. Every profit figure is after the 3% + RM1 card fee.
        </p>
      </div>

      <section aria-labelledby="money-heading" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="money-heading" className="font-display text-xl font-extrabold">
            Money in and out · {money.orders} paid orders
          </h2>
          <nav aria-label="Period" className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <Link
                key={p.days}
                href={link({ days: p.days })}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${p.days === days ? "bg-ink text-ground" : "bg-surface text-ink-2"}`}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Collected from customers" value={money.collected} note="Products + delivery, after promo codes" />
          <Tile
            label="Product cost"
            value={money.productCost}
            note={money.costMissingUnits ? `${money.costMissingUnits} units have no cost price` : "At today's cost prices"}
          />
          <Tile label="Card fees" value={money.fees} note="3% + RM1 per order (estimate)" />
          <Tile label="Profit" value={money.profit} tone={money.profit >= 0 ? "ok" : "bad"} note="Collected − cost − fees − delivery" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Tile label="Given away: clearance" value={money.discounts.clearance} />
          <Tile label="Given away: bundles" value={money.discounts.bundle} />
          <Tile label="Given away: sales" value={money.discounts.sale} />
          <Tile label="Given away: promo codes" value={money.codes} note="Sign-up and referral codes" />
          <Tile label="Delivery charged" value={money.delivery} note="Passed on to the courier" />
        </div>
        <p className="text-sm text-ink-2">
          Discounts given in total: <strong>{formatMyr(discountTotal)}</strong>.
          {money.unknownDiscountOrders > 0 &&
            ` ${money.unknownDiscountOrders} older orders were placed before discounts were recorded, so their discounts aren't in these figures.`}
          {cap != null &&
            ` On free-delivery orders you also pay up to ${formatMyr(Number(cap))} of the courier fee; courier bills aren't tracked here yet.`}
        </p>
      </section>

      <section aria-labelledby="margin-heading" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="margin-heading" className="font-display text-xl font-extrabold">
              Margin on every item, under every discount
            </h2>
            <p className="text-sm text-ink-2">
              {items.length} items with a cost price · average full-price margin {Math.round(avgMargin * 100)}% ·{" "}
              <strong className={losing.length ? "text-bad-fg" : "text-ok-fg"}>
                {losing.length} lose money in at least one case
              </strong>
            </p>
          </div>
          <Link href={link({ all: showAll ? undefined : "1" })} className="text-sm font-semibold text-ink underline">
            {showAll ? "Show only money-losers" : "Show all items"}
          </Link>
        </div>

        {shown.length === 0 ? (
          <p className="rounded-2xl border-2 border-line bg-surface p-6 text-ink-2">No item loses money under any discount.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-line bg-surface">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-ground text-left text-xs uppercase tracking-wide text-ink-2">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3">Profit per unit, by how it&apos;s sold</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => (
                  <tr key={`${i.product}-${i.variant}`} className="border-t border-line align-top">
                    <td className="p-3">
                      <span className="font-semibold">{i.product}</span>
                      <span className="block text-xs text-ink-2">{i.variant}</span>
                    </td>
                    <td className="p-3 text-right tabular-nums">{formatMyr(i.cost)}</td>
                    <td className="p-3">
                      <ul className="flex flex-wrap gap-1.5">
                        {i.rows.map((r) => (
                          <li
                            key={r.label}
                            title={`Sold at ${formatMyr(r.price)}`}
                            className={`rounded-lg px-2 py-1 text-xs tabular-nums ${r.profit < 0 ? "bg-bad-bg text-bad-fg" : r.margin < 0.1 ? "bg-warn-bg text-warn-fg" : "bg-ok-bg text-ok-fg"}`}
                          >
                            {r.label}: <strong>{formatMyr(r.profit)}</strong> ({Math.round(r.margin * 100)}%)
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-sm text-ink-2">
          Red = sold below cost after the card fee. Amber = under 10% margin. The shop gives only the single biggest
          discount, but a sign-up code is taken off at payment on top of it: that&apos;s the &ldquo;Worst&rdquo; case. To
          protect an item, raise its price, leave it out of the sale in Admin → Offers &amp; sales, or lower the sign-up
          discount in Settings.
        </p>
      </section>
    </div>
  );
}
