import "server-only";
import { getVariantStock, type ProductCardData, type VariantStock } from "@/components/product-card";
import type { CareProduct } from "@/lib/care-needs";
import { withPromos } from "@/lib/promotions-server";
import type { createClient } from "@/lib/supabase/server";

export type HouseProduct = ProductCardData & CareProduct;

/** Published own-brand products that have something in stock, ready for suggestion rows. */
export async function getHouseProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ products: HouseProduct[]; stock: VariantStock | null }> {
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name, pet_type, highlights, is_dvs_approved, size_display, brand_id, category_id, brands!inner(is_house_brand), product_images(path, alt, sort), variants(id, title, price)",
    )
    .eq("status", "published")
    .eq("brands.is_house_brand", true);
  const withSale = await withPromos((data ?? []) as unknown as (ProductCardData & Omit<CareProduct, "house">)[]);
  const rows = withSale.map((p) => ({
    ...p,
    house: true,
    product_images: [...p.product_images].sort(
      (a, b) => ((a as { sort?: number }).sort ?? 0) - ((b as { sort?: number }).sort ?? 0),
    ),
  }));
  const stock = await getVariantStock(supabase, rows.flatMap((p) => p.variants.map((v) => v.id)));
  const products = stock ? rows.filter((p) => p.variants.some((v) => (stock.get(v.id)?.available ?? 0) > 0)) : rows;
  return { products, stock };
}
