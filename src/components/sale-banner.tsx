import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { AutoBanner } from "@/components/auto-banner";
import { getVariantStock, productStock } from "@/components/product-card";
import { SaleCountdown } from "@/components/sale-countdown";
import { freeDeliveryCap, freeDeliveryMin, getDeliverySettings } from "@/lib/delivery-settings";
import type { ExpirySettings } from "@/lib/expiry";
import { createPublicClient } from "@/lib/supabase/public";
import { getRunningPromotions, getUpcomingPromotion } from "@/lib/promotions-server";

const pct = (d: number) => `${Math.round(d * 100)}% off`;

/** In-stock short-dated products and their best discount, same rule as the homepage clearance row. */
const getClearanceSummary = unstable_cache(
  async (): Promise<{ count: number; best: number } | null> => {
    const supabase = createPublicClient();
    const [{ data }, { data: settingsRow }] = await Promise.all([
      supabase.from("products").select("id, variants(id)").eq("status", "published"),
      supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
    ]);
    const products = (data ?? []) as { id: string; variants: { id: string }[] }[];
    const stock = await getVariantStock(supabase, products.flatMap((p) => p.variants.map((v) => v.id)));
    if (!stock) return null;
    const expiry = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
    const discounts = products
      .map((p) => productStock(p.variants, stock, expiry))
      .filter((s) => s.badge?.kind === "short-dated" && (s.available ?? 0) > 0)
      .map((s) => (s.badge?.kind === "short-dated" ? s.badge.discount : 0));
    return discounts.length ? { count: discounts.length, best: Math.max(...discounts) } : null;
  },
  ["clearance-summary"],
  { revalidate: 300 },
);
const SCOPE: Record<string, string> = { all: "everything", house: "our own brands", brand: "selected brands", category: "selected items" };

/**
 * Site-wide strip for approved holiday sales: counts down to the real end while a sale runs, and to the
 * real start in the week before one begins. Renders nothing otherwise.
 */
export async function SaleBanner() {
  const { promos } = await getRunningPromotions();
  const sale = [...promos].sort((a, b) => b.discount - a.discount)[0];
  const upcoming = sale ? null : await getUpcomingPromotion();
  if (!sale && !upcoming) {
    // No holiday sale: rotate the offers that are true right now.
    const [clearance, delivery] = await Promise.all([getClearanceSummary(), getDeliverySettings()]);
    return <AutoBanner clearance={clearance} freeMin={freeDeliveryMin(delivery)} freeCap={freeDeliveryCap(delivery)} />;
  }

  const strip = "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm font-bold";
  if (sale) {
    return (
      <Link href="/shop?deal=sale" className={`${strip} bg-terracotta text-cream hover:bg-rust`}>
        <span className="inline-flex items-center gap-2">
          <PartyPopper className="size-4 shrink-0 motion-safe:animate-bounce" aria-hidden />
          {sale.banner ?? `${sale.name}: ${pct(sale.discount)}`}
        </span>
        <SaleCountdown target={`${sale.ends_on}T23:59:59+08:00`} label="Ends in" />
      </Link>
    );
  }
  return (
    <div className={`${strip} bg-choc text-cream`}>
      <span className="inline-flex items-center gap-2">
        <PartyPopper className="size-4 shrink-0" aria-hidden />
        {upcoming!.name} is coming: {pct(upcoming!.discount)} {SCOPE[upcoming!.scope] ?? "selected items"}
      </span>
      <SaleCountdown target={`${upcoming!.starts_on}T00:00:00+08:00`} label="Starts in" />
    </div>
  );
}
