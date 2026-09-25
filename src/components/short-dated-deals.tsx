import { ArrowRight, Timer } from "lucide-react";
import Link from "next/link";
import { getVariantStock, ProductCard, type ProductCardData, productStock } from "@/components/product-card";
import { type ExpirySettings } from "@/lib/expiry";
import { createClient } from "@/lib/supabase/server";

/** Homepage clearance row: in-stock short-dated products, soonest best-before first. Hidden when there are none. */
export async function ShortDatedDeals() {
  const supabase = await createClient();
  const [{ data }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, pet_type, highlights, is_dvs_approved, size_display, product_images(path, alt), variants(id, title, price)")
      .eq("status", "published"),
    supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
  ]);
  const products = (data ?? []) as unknown as ProductCardData[];
  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
  const stock = await getVariantStock(supabase, products.flatMap((p) => p.variants.map((v) => v.id)));
  if (!stock) return null;

  const deals = products
    .map((p) => ({ p, s: productStock(p.variants, stock, expirySettings) }))
    .filter(({ s }) => s.badge?.kind === "short-dated" && (s.available ?? 0) > 0)
    .sort((a, b) => (a.s.nearest ?? "").localeCompare(b.s.nearest ?? ""))
    .slice(0, 8);
  if (deals.length === 0) return null;
  const best = Math.max(...deals.map(({ s }) => (s.badge?.kind === "short-dated" ? s.badge.discount : 0)));

  return (
    <section aria-labelledby="clearance-heading" className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="clearance-heading" className="flex items-center gap-2 font-bubble text-2xl font-extrabold text-choc">
            <Timer className="size-6 text-rust" aria-hidden /> Clearance: best before soon
          </h2>
          <p className="text-sm text-choc-2">
            Same quality, shorter date: up to {Math.round(best * 100)}% off while stocks last.
          </p>
        </div>
        <Link href="/shop?deal=short-dated" className="flex items-center gap-1 text-sm font-bold text-rust">
          See all clearance <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {deals.map(({ p }) => (
          <li key={p.id}>
            <ProductCard product={p} stock={stock} expirySettings={expirySettings} />
          </li>
        ))}
      </ul>
    </section>
  );
}
