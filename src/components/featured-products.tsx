import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getVariantStock, isShowcaseReady, ProductCard, type ProductCardData } from "@/components/product-card";
import { ProductRail } from "@/components/product-rail";
import { type ExpirySettings } from "@/lib/expiry";
import { withPromos } from "@/lib/promotions-server";
import { createPublicClient } from "@/lib/supabase/public";

/** Up to eight real published products (with a photo and stock) — same stock/expiry badges as /shop, no fabricated bestseller/rating badges. */
export async function FeaturedProducts() {
  const supabase = createPublicClient();
  const [{ data }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, pet_type, highlights, is_dvs_approved, size_display, brand_id, category_id, brands(is_house_brand), product_images(path, alt), variants(id, title, price)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
  ]);
  const candidates = await withPromos((data ?? []) as unknown as ProductCardData[]);
  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
  const stock = await getVariantStock(supabase, candidates.flatMap((p) => p.variants.map((v) => v.id)));
  const products = candidates.filter((p) => isShowcaseReady(p, stock)).slice(0, 8);
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="featured-heading" className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex items-center justify-between">
        <h2 id="featured-heading" className="font-bubble text-2xl font-extrabold text-choc">
          Featured products
        </h2>
        <Link href="/shop" className="flex items-center gap-1 text-sm font-bold text-rust">
          View all <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ProductRail label="Featured products">
        {products.map((p) => (
          <li key={p.id} className="snap-start">
            <ProductCard product={p} stock={stock} expirySettings={expirySettings} />
          </li>
        ))}
      </ProductRail>
    </section>
  );
}
