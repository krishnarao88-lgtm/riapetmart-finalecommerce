// Margin guard for discounts: an offer is only approved if every priced size keeps at least this margin.

export const MIN_OFFER_MARGIN = 0.15;

/**
 * Lowest margin across a product's priced sizes after `discount`, or null when any priced size has
 * no cost price (margin unknown, so the offer can't be checked).
 */
export function marginAfterDiscount(variants: { price: number; cost: number | null }[], discount: number): number | null {
  const priced = variants.filter((v) => v.price > 0);
  if (!priced.length || priced.some((v) => v.cost == null)) return null;
  return Math.min(...priced.map((v) => {
    const sell = v.price * (1 - discount);
    return (sell - (v.cost as number)) / sell;
  }));
}
