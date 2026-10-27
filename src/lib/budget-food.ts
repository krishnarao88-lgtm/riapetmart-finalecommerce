// "Makanan anjing/kucing murah" guides: the cheapest big bags of dry food by price per kg (owner, 27 Oct 2026).
export type BagRow = { slug: string; name: string; title: string; price: number; available: number };
export type Bag = BagRow & { kg: number; perKg: number };

const KG = /(\d+(?:\.\d+)?)\s*kg/i;

/** Bag size from the size option ("15 kg"), else from the product name ("DOGSOME KITCHEN LAMB 15KG"). */
export function kgOf(title: string, name: string): number | null {
  const m = title.match(KG) ?? name.match(KG);
  return m ? Number(m[1]) : null;
}

/** In-stock bags of at least `minKg`, cheapest per kg first, one size per product. */
export function cheapestBigBags(rows: BagRow[], minKg = 10, limit = 6, maxPerKg = Infinity): Bag[] {
  const bags = rows
    .map((r) => ({ ...r, kg: kgOf(r.title, r.name) ?? 0 }))
    .filter((r) => r.available > 0 && r.kg >= minKg && r.price > 0)
    .map((r) => ({ ...r, perKg: Math.round((r.price / r.kg) * 100) / 100 }))
    .filter((r) => r.perKg <= maxPerKg)
    .sort((a, b) => a.perKg - b.perKg);
  const seen = new Set<string>();
  return bags.filter((b) => !seen.has(b.slug) && seen.add(b.slug)).slice(0, limit);
}
