import "server-only";
import { cache } from "react";
import { todayInKL } from "@/lib/kl-time";
import { type CardPromo, type Promotion, promoFor, promoLabel } from "@/lib/promotions";
import { createClient } from "@/lib/supabase/server";

/** Sales running today in Malaysia. Cached per request, so every card on a page shares one query. */
export const getRunningPromotions = cache(async (): Promise<{ today: string; promos: Promotion[] }> => {
  const today = todayInKL();
  const supabase = await createClient();
  const { data } = await supabase
    .from("promotions")
    .select("id, name, starts_on, ends_on, discount, scope, brand_id, category_id, banner")
    .eq("is_active", true)
    .lte("starts_on", today)
    .gte("ends_on", today);
  return { today, promos: ((data ?? []) as Promotion[]).map((p) => ({ ...p, discount: Number(p.discount) })) };
});

type Promotable = { brand_id?: string | null; category_id?: string | null; brands?: unknown };

/** Attaches today's best sale (if any) to each product for the card badge and price. */
export async function withPromos<T extends object>(products: T[]): Promise<(T & { promo: CardPromo | null })[]> {
  const { today, promos } = await getRunningPromotions();
  return products.map((row) => {
    const p = row as Promotable;
    const hit = promos.length
      ? promoFor(
          {
            brand_id: p.brand_id ?? null,
            category_id: p.category_id ?? null,
            house: (p.brands as { is_house_brand?: boolean } | null)?.is_house_brand === true,
          },
          promos,
          today,
        )
      : null;
    return { ...row, promo: hit ? { label: promoLabel(hit), discount: hit.discount } : null };
  });
}
