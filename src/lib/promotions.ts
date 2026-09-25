// Scheduled sales (Deepavali, 11.11, Raya…). Pure rules shared by checkout pricing and the storefront;
// the rows live in the promotions table and are edited under Admin → Promotions.

export type Promotion = {
  id: string;
  name: string;
  starts_on: string; // YYYY-MM-DD, Malaysia time, inclusive
  ends_on: string;
  discount: number; // 0.1 = 10% off
  scope: "all" | "house" | "brand" | "category";
  brand_id: string | null;
  category_id: string | null;
  banner: string | null;
  /** Left out at approval because the sale would push their margin under the floor. */
  excluded_product_ids?: string[];
};

export type CardPromo = { label: string; discount: number };

export type PromoTarget = { id?: string; brand_id: string | null; category_id: string | null; house: boolean };

export function isRunning(p: Pick<Promotion, "starts_on" | "ends_on">, today: string): boolean {
  return p.starts_on <= today && today <= p.ends_on;
}

function covers(p: Promotion, t: PromoTarget): boolean {
  if (p.scope === "all") return true;
  if (p.scope === "house") return t.house;
  if (p.scope === "brand") return p.brand_id !== null && p.brand_id === t.brand_id;
  return p.category_id !== null && p.category_id === t.category_id;
}

/** The biggest running sale that covers this product, or null. */
export function promoFor(t: PromoTarget, promos: Promotion[], today: string): Promotion | null {
  return (
    promos
      .filter((p) => isRunning(p, today) && covers(p, t) && !(t.id && p.excluded_product_ids?.includes(t.id)))
      .sort((a, b) => b.discount - a.discount)[0] ?? null
  );
}

/** Short badge text, e.g. "Deepavali Sale -10%". */
export function promoLabel(p: Pick<Promotion, "name" | "discount">): string {
  return `${p.name} -${Math.round(p.discount * 100)}%`;
}
