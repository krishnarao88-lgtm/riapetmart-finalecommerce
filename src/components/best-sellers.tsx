import { getVariantStock, ProductCard, type ProductCardData } from "@/components/product-card";
import { type ExpirySettings } from "@/lib/expiry";
import { withPromos } from "@/lib/promotions-server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** Units sold per variant across paid orders. Only ids and counts leave this function, never customer data. */
async function soldByVariant() {
  // ponytail: sums paid orders in JS (PostgREST caps at 1000 rows); move to a SQL view/RPC over
  // jsonb_array_elements(items) when orders grow.
  const { data, error } = await createServiceClient().from("orders").select("items").eq("status", "paid");
  if (error) throw error;
  const sold = new Map<string, number>();
  for (const { items } of data as { items: { variant_id?: string; qty?: number }[] }[]) {
    for (const it of items ?? []) {
      if (it.variant_id) sold.set(it.variant_id, (sold.get(it.variant_id) ?? 0) + (Number(it.qty) || 0));
    }
  }
  return sold;
}

/** Up to four published products ranked by real units sold; nothing until at least two have sales. */
export async function BestSellers() {
  const sold = await soldByVariant().catch((err) => {
    console.error("best sellers failed", err?.message ?? err);
    return new Map<string, number>();
  });
  if (sold.size === 0) return null;

  const supabase = await createClient();
  // RLS only returns active variants of published products, so retired items drop out here.
  const { data: variants } = await supabase.from("variants").select("id, product_id").in("id", [...sold.keys()]);
  const byProduct = new Map<string, number>();
  for (const v of variants ?? []) byProduct.set(v.product_id, (byProduct.get(v.product_id) ?? 0) + sold.get(v.id)!);
  const top = [...byProduct].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);
  if (top.length < 2) return null;

  const [{ data }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, pet_type, highlights, is_dvs_approved, size_display, brand_id, category_id, brands(is_house_brand), product_images(path, alt), variants(id, title, price)")
      .eq("status", "published")
      .in("id", top),
    supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
  ]);
  const products = (await withPromos((data ?? []) as unknown as ProductCardData[])).sort((a, b) => top.indexOf(a.id) - top.indexOf(b.id));
  if (products.length < 2) return null;
  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
  const stock = await getVariantStock(supabase, products.flatMap((p) => p.variants.map((v) => v.id)));

  return (
    <section aria-labelledby="best-sellers-heading" className="mx-auto max-w-6xl px-4 pt-10">
      <h2 id="best-sellers-heading" className="font-bubble text-2xl font-extrabold text-choc">
        Best sellers
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} stock={stock} expirySettings={expirySettings} />
          </li>
        ))}
      </ul>
    </section>
  );
}
