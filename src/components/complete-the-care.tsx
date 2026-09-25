import { Sparkles } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { BUNDLE_DISCOUNT, type CareProduct, suggestHouse } from "@/lib/care-needs";
import type { ExpirySettings } from "@/lib/expiry";
import { getHouseProducts } from "@/lib/house-products";
import { createClient } from "@/lib/supabase/server";

/** Own-brand products that serve the same need as this product; hidden when nothing matches. */
export async function CompleteTheCare({
  product,
  expirySettings,
}: {
  product: CareProduct;
  expirySettings: Partial<ExpirySettings>;
}) {
  const supabase = await createClient();
  const { products, stock } = await getHouseProducts(supabase);
  const picks = suggestHouse([product], products, 3);
  if (picks.length === 0) return null;

  return (
    <section aria-labelledby="care-heading" className="mt-12 rounded-3xl border-2 border-choc bg-peach/30 p-5">
      <h2 id="care-heading" className="flex items-center gap-2 font-bubble text-xl font-extrabold text-choc">
        <Sparkles className="size-5 text-rust" aria-hidden /> Complete the care
      </h2>
      <p className="mt-1 text-sm text-choc-2">
        {product.house
          ? "Pairs well with these from the same range."
          : `Add one of these and it's ${Math.round(BUNDLE_DISCOUNT * 100)}% off when bought together.`}
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {picks.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} stock={stock} expirySettings={expirySettings} />
          </li>
        ))}
      </ul>
    </section>
  );
}
