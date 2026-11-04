import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Product ids for the "Best seller" and "Popular this week" card badges, from real data only:
 * best seller = bought in at least 2 separate paid website orders; popular = top 8 by product views in the
 * last 7 days (10+ views). Only ids leave this function, never customer data. Refreshed hourly.
 */
export const getCardHighlights = unstable_cache(
  async () => {
    const db = createServiceClient();
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    // ponytail: scans paid orders and a week of views in JS; move to SQL views when volumes grow.
    const [{ data: orders }, { data: views }, { data: variants }] = await Promise.all([
      db.from("orders").select("id, items").eq("status", "paid").eq("is_test", false),
      db.from("product_views").select("product_id").gte("viewed_at", since).limit(20000),
      db.from("variants").select("id, product_id"),
    ]);
    const productOf = new Map((variants ?? []).map((v) => [v.id as string, v.product_id as string]));
    const ordersPer = new Map<string, Set<string>>();
    for (const o of (orders ?? []) as { id: string; items: { variant_id?: string }[] }[]) {
      for (const it of o.items ?? []) {
        const pid = it.variant_id && productOf.get(it.variant_id);
        if (pid) ordersPer.set(pid, (ordersPer.get(pid) ?? new Set()).add(o.id));
      }
    }
    const viewCount = new Map<string, number>();
    for (const v of (views ?? []) as { product_id: string }[]) viewCount.set(v.product_id, (viewCount.get(v.product_id) ?? 0) + 1);
    return {
      bestSellers: [...ordersPer].filter(([, s]) => s.size >= 2).map(([id]) => id),
      popular: [...viewCount].filter(([, n]) => n >= 10).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id),
    };
  },
  ["card-highlights"],
  { revalidate: 3600 },
);
