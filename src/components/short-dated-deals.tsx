import { ArrowRight, Timer } from "lucide-react";
import Link from "next/link";
import { getVariantStock, ProductCard, type ProductCardData, productStock } from "@/components/product-card";
import { ProductRail } from "@/components/product-rail";
import { type ExpirySettings } from "@/lib/expiry";
import { withPromos } from "@/lib/promotions-server";
import { createPublicClient } from "@/lib/supabase/public";

/** Homepage clearance row: in-stock short-dated products, soonest best-before first. Hidden when there are none. */
export async function ShortDatedDeals() {
  const supabase = createPublicClient();
  const [{ data }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, pet_type, highlights, is_dvs_approved, size_display, brand_id, category_id, brands(is_house_brand), product_images(path, alt), variants(id, title, price)")
      .eq("status", "published"),
    supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
  ]);
  const products = await withPromos((data ?? []) as unknown as ProductCardData[]);
  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
  const stock = await getVariantStock(supabase, products.flatMap((p) => p.variants.map((v) => v.id)));
  if (!stock) return null;

  const deals = products
    .map((p) => ({ p, s: productStock(p.variants, stock, expirySettings) }))
    .filter(({ p, s }) => s.badge?.kind === "short-dated" && (s.available ?? 0) > 0 && p.product_images.length > 0)
    .sort((a, b) => (a.s.nearest ?? "").localeCompare(b.s.nearest ?? ""))
    .slice(0, 8);
  if (deals.length === 0) return null;
  const best = Math.max(...deals.map(({ s }) => (s.badge?.kind === "short-dated" ? s.badge.discount : 0)));

  return (
    <section aria-labelledby="clearance-heading" className="mx-auto max-w-6xl px-4 pt-10">
      {/* Raised "sticker" panel so clearance is the first offer people notice. */}
      <div className="relative rounded-3xl border-2 border-choc bg-rust p-4 pb-2 shadow-[5px_5px_0_0_var(--color-choc)] sm:p-6 sm:pb-3">
        <span className="absolute -top-4 right-4 rotate-6 rounded-full border-2 border-choc bg-peach px-3 py-1 font-bubble text-lg font-extrabold text-choc shadow-[2px_2px_0_0_var(--color-choc)] sm:right-6">
          Up to {Math.round(best * 100)}% off
        </span>
        <div className="flex flex-wrap items-end justify-between gap-2 pr-28 sm:pr-40">
          <div>
            <h2 id="clearance-heading" className="flex items-center gap-2 font-bubble text-2xl font-extrabold text-cream sm:text-3xl">
              <Timer className="size-6 text-peach" aria-hidden /> Clearance sale
            </h2>
            <p className="text-sm text-cream/85">Same quality, best-before soon. While stocks last.</p>
          </div>
        </div>
        <Link
          href="/shop?deal=short-dated"
          className="mt-3 inline-flex items-center gap-1 rounded-full border-2 border-choc bg-cream px-4 py-1.5 text-sm font-bold text-choc shadow-[2px_2px_0_0_var(--color-choc)] transition-transform hover:-translate-y-0.5"
        >
          See all clearance <ArrowRight className="size-4" aria-hidden />
        </Link>
      <ProductRail label="Clearance deals">
        {deals.map(({ p }) => (
          <li key={p.id} className="snap-start">
            <ProductCard product={p} stock={stock} expirySettings={expirySettings} />
          </li>
        ))}
      </ProductRail>
      </div>
    </section>
  );
}
