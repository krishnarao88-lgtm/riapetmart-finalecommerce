import { createClient } from "@supabase/supabase-js";
import { getVariantStock } from "@/components/product-card";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { DELIVERY_NOTE, feedHighlights, feedTitle, googleCategory, productType } from "@/lib/feed-enrich";
import { feedDescription, productDescription, type FeedItem } from "@/lib/seo";
import { site, supabasePublishableKey, supabaseUrl } from "@/lib/site";

// Google Shopping won't list prescription-type pet medicines in Malaysia ("Pet Pharmaceuticals" policy).
// They stay on sale on the website; they're just left out of the Google feeds.
const GOOGLE_EXCLUDED = new Set(["nexgard-combo-small", "nexgard-combo-large"]);

type FeedProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  pet_type: string | null;
  highlights: string[] | null;
  brands: { name: string } | null;
  categories: { name: string } | null;
  product_images: { path: string; sort: number }[];
  variants: { id: string; title: string; price: number; barcode: string | null }[];
};

/** Every sellable variant as a Google feed item; shared by the online feed and the store inventory feed. */
export async function loadFeedItems(): Promise<FeedItem[]> {
  // Cookie-free so the feed can be cached; RLS already limits this to published products and active variants.
  const supabase = createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } });
  const [{ data, error }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, description, pet_type, highlights, brands(name), categories(name), product_images!inner(path, sort), variants(id, title, price, barcode)")
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

  return products.filter((p) => !GOOGLE_EXCLUDED.has(p.slug)).flatMap((p) => {
    const image = [...p.product_images].sort((a, b) => a.sort - b.sort)[0].path;
    const category = p.categories?.name ?? null;
    const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null;
    return p.variants.map((v) => {
      const row = stock.get(v.id);
      const badge = getExpiryBadge(row?.nearest_expiry ?? null, expirySettings);
      return {
        id: v.id,
        groupId: p.variants.length > 1 ? p.id : null,
        title: `${feedTitle(p.name, p.pet_type, category)} – ${v.title}`,
        description: feedDescription(p.description ? `${p.description} ${DELIVERY_NOTE}` : productDescription(p.name, minPrice)),
        link: `${site.url}/shop/${p.slug}`,
        image,
        price: v.price,
        salePrice: badge?.kind === "short-dated" ? discountedPrice(v.price, badge.discount) : null,
        inStock: (row?.available ?? 0) > 0,
        brand: p.brands?.name ?? null,
        // Shop-made barcodes (GS1 in-store range 20-29) aren't real GTINs; Google must only get manufacturer codes.
        gtin: v.barcode && /^\d{8,14}$/.test(v.barcode) && !/^2\d{12}$/.test(v.barcode) ? v.barcode : null,
        googleCategory: googleCategory(p.pet_type, category),
        productType: productType(p.pet_type, category),
        highlights: feedHighlights(p.highlights, category),
      };
    });
  });
}
