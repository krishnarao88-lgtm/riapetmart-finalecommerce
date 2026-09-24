import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { type ExpirySettings } from "@/lib/expiry";
import { createClient } from "@/lib/supabase/server";

/** Four real published products — same expiry/clearance badges as /shop, no fabricated bestseller/rating badges. */
export async function FeaturedProducts() {
  const supabase = await createClient();
  const [{ data }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, size_display, product_images(path, alt), variants(id, title, price, stock_batches(expiry_date))")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
  ]);
  const products = (data ?? []) as unknown as ProductCardData[];
  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
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
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} expirySettings={expirySettings} />
          </li>
        ))}
      </ul>
    </section>
  );
}
