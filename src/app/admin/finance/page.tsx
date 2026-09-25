import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { moneySummary, productScenarios, safePrice, type FinanceOrder, type Scenario } from "@/lib/finance";
import { formatMyr } from "@/lib/pricing";
import { promoFor, type Promotion } from "@/lib/promotions";
import { toWelcomeOffer } from "@/lib/welcome-offer";
import { raisePrices, stopCodeStacking } from "./actions";

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
  const { days: daysParam, all, per: perParam, page: pageParam } = await searchParams;
  const per = [20, 50, 100].includes(Number(perParam)) ? Number(perParam) : 20;
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
  type Row = {
    id: string;
    product: string;
    variant: string;
    price: number;
    cost: number;
    rows: Scenario[];
    worst: Scenario;
    /** Safe again once codes stop stacking on discounted prices. */
    fixedBySwitch: boolean;
    /** Price that keeps 5% margin at its deepest discount, when a raise is still needed after the switch. */
    safe: number | null;
  };
  const stacking = welcome.stack_with_discounts;
  const lowest = (rows: Scenario[]) => rows.reduce((a, b) => (b.profit < a.profit ? b : a));
  const items: Row[] = [];
  for (const p of products) {
    const target = { id: p.id, brand_id: p.brand_id, category_id: p.category_id, house: p.brands?.is_house_brand ?? false };
    // The biggest sale that will cover this product, running now or scheduled later.
    const sale = Math.max(0, ...promos.map((promo) => promoFor(target, [promo], promo.starts_on < today ? today : promo.starts_on)?.discount ?? 0));
    for (const v of p.variants) {
      if (!v.variant_costs || Number(v.price) <= 0) continue;
      const cost = Number(v.variant_costs.cost_price);
      const price = Number(v.price);
      const offers = {
        clearance,
        bundle: bundles.get(p.id) ?? null,
        sale: sale || null,
        welcome: welcome.enabled ? welcome.percent / 100 : null,
      };
      const rows = productScenarios(price, cost, { ...offers, stack: stacking });
      const worst = lowest(rows);
      const afterSwitch = lowest(productScenarios(price, cost, { ...offers, stack: false }));
      items.push({
        id: v.id,
        product: p.name,
        variant: v.title,
        price,
        cost,
        rows,
        worst,
        fixedBySwitch: stacking && worst.profit < 0 && afterSwitch.profit >= 0,
        safe: afterSwitch.profit < 0 ? safePrice(cost, 1 - afterSwitch.price / price) : null,
      });
    }
  }
  items.sort((a, b) => a.worst.margin - b.worst.margin);
  const losing = items.filter((i) => i.worst.profit < 0);
  const switchFixes = losing.filter((i) => i.fixedBySwitch).length;
  const needRaise = losing.filter((i) => i.safe !== null);
  const list = showAll ? items : losing;
  const pages = Math.max(1, Math.ceil(list.length / per));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(pageParam)) || 1));
  const shown = list.slice((page - 1) * per, page * per);
  const avgMargin = items.length ? items.reduce((s, i) => s + i.rows[0].margin, 0) / items.length : 0;
  const link = (q: Record<string, string | number | undefined>) =>
    `/admin/finance?${new URLSearchParams(
      Object.entries({ days, all: showAll ? "1" : undefined, per: per === 20 ? undefined : per, ...q })
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
        <AutoRefresh seconds={60} />
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
          <Link href={link({ all: showAll ? undefined : "1", page: undefined })} className="text-sm font-semibold text-ink underline">
            {showAll ? "Show only money-losers" : "Show all items"}
          </Link>
        </div>

        {(switchFixes > 0 || needRaise.length > 0) && (
          <div className="grid gap-3 rounded-2xl border-2 border-ink bg-surface p-4">
            <h3 className="font-display text-lg font-extrabold">Suggested fixes</h3>
            {switchFixes > 0 && (
              <form action={stopCodeStacking} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ground p-3">
                <p className="text-sm">
                  <strong>Stop promo codes stacking on discounted prices.</strong> Codes still work on full-price items.
                  Fixes <strong>{switchFixes}</strong> item{switchFixes === 1 ? "" : "s"}.
                </p>
                <button type="submit" className="min-h-9 rounded-full bg-ok-bg px-4 text-sm font-semibold text-ok-fg">
                  Approve
                </button>
              </form>
            )}
            {needRaise.length > 0 && (
              <form action={raisePrices} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ground p-3">
                {needRaise.map((i) => (
                  <input key={i.id} type="hidden" name="raise" value={`${i.id}:${i.safe}`} />
                ))}
                <p className="text-sm">
                  <strong>Raise {needRaise.length} price{needRaise.length === 1 ? "" : "s"}</strong> so each keeps at least 5%
                  margin even at its deepest discount. The new price is shown on each item below.
                </p>
                <button type="submit" className="min-h-9 rounded-full bg-ok-bg px-4 text-sm font-semibold text-ok-fg">
                  Approve all
                </button>
              </form>
            )}
            <p className="text-xs text-ink-2">Approved fixes apply to the live shop straight away.</p>
          </div>
        )}

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
                      {i.fixedBySwitch && <span className="mt-1 block text-xs font-semibold text-ok-fg">Fixed by stopping code stacking</span>}
                      {i.safe !== null && (
                        <form action={raisePrices} className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <input type="hidden" name="raise" value={`${i.id}:${i.safe}`} />
                          <span>
                            Raise {formatMyr(i.price)} → <strong>{formatMyr(i.safe)}</strong> (+
                            {Math.round((i.safe / i.price - 1) * 100)}%)
                          </span>
                          <button type="submit" className="rounded-full bg-ok-bg px-2.5 py-0.5 font-semibold text-ok-fg">
                            Approve
                          </button>
                        </form>
                      )}
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
        {list.length > 20 && (
          <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-ink-2">
              {(page - 1) * per + 1}–{Math.min(page * per, list.length)} of {list.length}
            </span>
            <span className="flex items-center gap-1">
              {page > 1 && (
                <Link href={link({ page: page - 1 })} className="rounded-full bg-surface px-3 py-1.5 font-semibold">
                  ← Previous
                </Link>
              )}
              <span className="px-2 text-ink-2">
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link href={link({ page: page + 1 })} className="rounded-full bg-surface px-3 py-1.5 font-semibold">
                  Next →
                </Link>
              )}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-ink-2">Per page:</span>
              {[20, 50, 100].map((n) => (
                <Link
                  key={n}
                  href={link({ per: n === 20 ? undefined : n, page: undefined })}
                  className={`rounded-full px-2.5 py-1 font-semibold ${n === per ? "bg-ink text-ground" : "bg-surface text-ink-2"}`}
                >
                  {n}
                </Link>
              ))}
            </span>
          </nav>
        )}
        <p className="text-sm text-ink-2">
          Red = sold below cost after the card fee. Amber = under 10% margin. The shop gives only the single biggest
          discount.{" "}
          {stacking
            ? "Right now a promo code can still come off on top of it at payment: that's the \u201cWorst\u201d case."
            : "Promo codes can't be used on discounted prices, so a code only ever comes off a full-price item."}{" "}
          To protect an item, raise its price, leave it out of the sale in Admin → Offers &amp; sales, or lower the
          sign-up discount in Settings.
        </p>
      </section>
    </div>
  );
}
