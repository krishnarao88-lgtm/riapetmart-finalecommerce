// Dashboard maths, kept pure so it can be tested: periods are Malaysia calendar days (UTC+8).

const KL = 8 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export type Period = "today" | "week" | "month" | "custom";
export const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

/** Stripe Malaysia list price for local cards (3% + RM1). An estimate: FPX and wallets cost a little less. */
export const STRIPE_FEE = { rate: 0.03, fixed: 1 };

const klDate = (d: Date) => new Date(d.getTime() + KL).toISOString().slice(0, 10);
const klMidnight = (ymd: string) => new Date(Date.parse(`${ymd}T00:00:00Z`) - KL);

/** [start, end) of a period plus every Malaysia date in it, for the daily chart. */
export function periodRange(period: Period, from?: string, to?: string, now = new Date()) {
  const today = klDate(now);
  let startDay = today;
  let endDay = today;
  if (period === "week") {
    const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    startDay = klDate(new Date(klMidnight(today).getTime() - dow * DAY));
  } else if (period === "month") {
    startDay = `${today.slice(0, 8)}01`;
  } else if (period === "custom") {
    const ok = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
    startDay = ok(from) ? from! : today;
    endDay = ok(to) ? to! : today;
    if (endDay < startDay) [startDay, endDay] = [endDay, startDay];
    // Cap at a year so a typo can't ask for decades of bars.
    const maxEnd = klDate(new Date(klMidnight(startDay).getTime() + 365 * DAY));
    if (endDay > maxEnd) endDay = maxEnd;
  }
  const days: string[] = [];
  for (let t = klMidnight(startDay).getTime(); t <= klMidnight(endDay).getTime(); t += DAY) days.push(klDate(new Date(t)));
  return { start: klMidnight(startDay), end: new Date(klMidnight(endDay).getTime() + DAY), days };
}

export type DashItem = { variant_id: string; name: string; title: string; qty: number; price: number };
export type DashOrder = {
  created_at: string;
  total: number;
  shipping_cost: number | null;
  fulfilment_status: string;
  items: DashItem[];
};

export function summarise(orders: DashOrder[], costs: Map<string, number>, days: string[]) {
  const byDay = new Map(days.map((d) => [d, 0]));
  const products = new Map<string, { units: number; revenue: number }>();
  let gross = 0, shipping = 0, itemsSold = 0, fees = 0, margin = 0, costMissing = 0, toShip = 0;

  for (const o of orders) {
    const total = Number(o.total);
    gross += total;
    shipping += Number(o.shipping_cost ?? 0);
    fees += total * STRIPE_FEE.rate + STRIPE_FEE.fixed;
    if (o.fulfilment_status === "new" || o.fulfilment_status === "packed") toShip += 1;
    const day = klDate(new Date(o.created_at));
    if (byDay.has(day)) byDay.set(day, byDay.get(day)! + total);
    for (const it of o.items ?? []) {
      itemsSold += it.qty;
      const p = products.get(it.name) ?? { units: 0, revenue: 0 };
      p.units += it.qty;
      p.revenue += it.price * it.qty;
      products.set(it.name, p);
      const cost = costs.get(it.variant_id);
      if (cost === undefined) costMissing += it.qty;
      else margin += (it.price - cost) * it.qty;
    }
  }

  const productRevenue = [...products.values()].reduce((s, p) => s + p.revenue, 0);
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    gross: round(gross),
    orders: orders.length,
    avgOrder: orders.length ? round(gross / orders.length) : 0,
    shipping: round(shipping),
    itemsSold,
    fees: round(fees),
    net: round(gross - fees),
    profit: round(margin - fees),
    costMissing,
    toShip,
    byDay: [...byDay].map(([day, total]) => ({ day, total: round(total) })),
    topProducts: [...products]
      .map(([name, p]) => ({ name, units: p.units, revenue: round(p.revenue), share: productRevenue ? p.revenue / productRevenue : 0 }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}
