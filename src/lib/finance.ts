// Admin → Finance maths, kept pure so it can be tested. All profits are after the card fee.
import { STRIPE_FEE } from "./dashboard.ts";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type Scenario = { label: string; price: number; profit: number; margin: number };

/** Profit on one unit at a price, after Stripe's % fee (the RM1 per order is counted per order, not per item). */
export function unitProfit(price: number, cost: number) {
  return round2(price * (1 - STRIPE_FEE.rate) - cost);
}

function scenario(label: string, price: number, cost: number): Scenario {
  const p = round2(price);
  const profit = unitProfit(p, cost);
  return { label, price: p, profit, margin: p > 0 ? Math.round((profit / p) * 1000) / 1000 : 0 };
}

/**
 * Every way one item can be sold: full price, each discount on its own (they never stack in the shop),
 * and the worst case — the biggest discount plus a sign-up code, which Stripe applies on top.
 */
export function productScenarios(
  price: number,
  cost: number,
  offers: { clearance: number[]; bundle: number | null; sale: number | null; welcome: number | null },
): Scenario[] {
  const rows = [scenario("Full price", price, cost)];
  for (const d of offers.clearance) rows.push(scenario(`Clearance -${Math.round(d * 100)}%`, price * (1 - d), cost));
  if (offers.bundle) rows.push(scenario(`Bundle -${Math.round(offers.bundle * 100)}%`, price * (1 - offers.bundle), cost));
  if (offers.sale) rows.push(scenario(`Sale -${Math.round(offers.sale * 100)}%`, price * (1 - offers.sale), cost));
  if (offers.welcome) {
    const biggest = Math.max(0, ...offers.clearance, offers.bundle ?? 0, offers.sale ?? 0);
    const label = biggest ? `Worst: -${Math.round(biggest * 100)}% + sign-up ${Math.round(offers.welcome * 100)}%` : `Sign-up code -${Math.round(offers.welcome * 100)}%`;
    rows.push(scenario(label, price * (1 - biggest) * (1 - offers.welcome), cost));
  }
  return rows;
}

export type FinanceItem = {
  variant_id: string;
  qty: number;
  price: number;
  list_price?: number;
  discount?: "short-dated" | "bundle" | "sale" | null;
};
export type FinanceOrder = {
  total: number;
  shipping_cost: number | null;
  code_discount: number | null;
  items: FinanceItem[];
};

/** Where the money went over a set of paid orders. Older orders didn't record list prices, so they're counted separately. */
export function moneySummary(orders: FinanceOrder[], costs: Map<string, number>) {
  const discounts = { "short-dated": 0, bundle: 0, sale: 0 };
  let sales = 0, delivery = 0, codes = 0, productCost = 0, fees = 0, collected = 0;
  let unknownDiscountOrders = 0, costMissingUnits = 0;

  for (const o of orders) {
    const total = Number(o.total);
    collected += total;
    delivery += Number(o.shipping_cost ?? 0);
    codes += Number(o.code_discount ?? 0);
    fees += total * STRIPE_FEE.rate + STRIPE_FEE.fixed;
    if (o.items.some((it) => it.list_price === undefined)) unknownDiscountOrders += 1;
    for (const it of o.items) {
      sales += it.price * it.qty;
      if (it.discount && it.list_price !== undefined) discounts[it.discount] += (it.list_price - it.price) * it.qty;
      const cost = costs.get(it.variant_id);
      if (cost === undefined) costMissingUnits += it.qty;
      else productCost += cost * it.qty;
    }
  }

  // `total` is what the order was priced at before any Stripe code; take the code off to get what we collected.
  collected -= codes;
  const profit = collected - delivery - productCost - fees;
  return {
    orders: orders.length,
    sales: round2(sales),
    discounts: {
      clearance: round2(discounts["short-dated"]),
      bundle: round2(discounts.bundle),
      sale: round2(discounts.sale),
    },
    codes: round2(codes),
    delivery: round2(delivery),
    collected: round2(collected),
    productCost: round2(productCost),
    fees: round2(fees),
    profit: round2(profit),
    unknownDiscountOrders,
    costMissingUnits,
  };
}
