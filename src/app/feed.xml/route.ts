import { createClient } from "@supabase/supabase-js";
import { getVariantStock } from "@/components/product-card";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { productDescription, productFeedXml, titleCase, type FeedItem } from "@/lib/seo";
import { site, supabasePublishableKey, supabaseUrl } from "@/lib/site";

export const revalidate = 3600;

type FeedProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brands: { name: string } | null;
  product_images: { path: string; sort: number }[];
  variants: { id: string; title: string; price: number; barcode: string | null }[];
};

export async function GET() {
  // Cookie-free so the feed can be cached; RLS already limits this to published products and active variants.
  const supabase = createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } });
  const [{ data, error }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, description, brands(name), product_images!inner(path, sort), variants(id, title, price, barcode)")
      .eq("status", "published")
      .order("name"),
    supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
  ]);
  if (error) throw new Error(`feed products failed: ${error.message}`);

  const products = (data ?? []) as unknown as FeedProduct[];
  const stock = await getVariantStock(supabase, products.flatMap((p) => p.variants.map((v) => v.id)));
  // Unknown stock would publish wrong availability; throwing keeps the last good feed.
  if (!stock) throw new Error("feed stock lookup failed");
  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;

  const items: FeedItem[] = products.flatMap((p) => {
    const image = [...p.product_images].sort((a, b) => a.sort - b.sort)[0].path;
    const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null;
    return p.variants.map((v) => {
      const row = stock.get(v.id);
      const badge = getExpiryBadge(row?.nearest_expiry ?? null, expirySettings);
      return {
        id: v.id,
        groupId: p.variants.length > 1 ? p.id : null,
        title: `${titleCase(p.name)} – ${v.title}`,
        description: p.description || productDescription(p.name, minPrice),
        link: `${site.url}/shop/${p.slug}`,
        image,
        price: v.price,
        salePrice: badge?.kind === "short-dated" ? discountedPrice(v.price, badge.discount) : null,
        inStock: (row?.available ?? 0) > 0,
        brand: p.brands?.name ?? null,
        gtin: v.barcode && /^\d{8,14}$/.test(v.barcode) ? v.barcode : null,
      };
    });
  });

  const xml = productFeedXml(
    { title: site.name, link: site.url, description: site.description },
    items,
  );
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
