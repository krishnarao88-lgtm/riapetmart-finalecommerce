// Margin = profit as a share of the SELLING price. Markup = profit as a share of COST.
// price = cost / (1 - margin), rounded up to the nearest step (default 10 sen).

export const DEFAULT_ROUND_UP = 0.1;
export const MAX_MARGIN = 0.95;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function roundUpTo(value: number, step: number): number {
  if (step <= 0) return round2(value);
  // Work in whole steps to dodge float drift (e.g. 55.599999 -> 55.60).
  return round2(Math.ceil(round2(value / step) - 1e-9) * step);
}

/** Selling price for a cost and margin. Margin must be 0 ≤ m < 0.95. */
export function priceFromMargin(cost: number, margin: number, roundUp = DEFAULT_ROUND_UP): number {
  if (!Number.isFinite(cost) || cost < 0) throw new RangeError("cost must be 0 or more");
  if (!Number.isFinite(margin) || margin < 0 || margin >= MAX_MARGIN) {
    throw new RangeError(`margin must be between 0 and ${MAX_MARGIN}`);
  }
  return roundUpTo(cost / (1 - margin), roundUp);
}

/** The margin a hand-typed price actually gives. Null when the price is 0 or less. */
export function marginFromPrice(cost: number, price: number): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(price) || price <= 0) return null;
  return round4((price - cost) / price);
}

/** Markup on cost, shown next to the margin so the two are never confused. */
export function markupFromPrice(cost: number, price: number): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(price) || cost <= 0) return null;
  return round4((price - cost) / cost);
}

export function profitPerUnit(cost: number, price: number): number {
  return round2(price - cost);
}

/**
 * What the customer pays for delivery. Over the free-delivery minimum we cover up to `cap`
 * (all of it when cap is null), so heavy or far orders don't wipe out the margin.
 */
export function deliveryCharge(raw: number, subtotal: number, freeMin: number | null, cap: number | null): number {
  if (freeMin === null || subtotal < freeMin) return round2(raw);
  return cap === null ? 0 : round2(Math.max(0, raw - cap));
}

export function formatMyr(value: number): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}
