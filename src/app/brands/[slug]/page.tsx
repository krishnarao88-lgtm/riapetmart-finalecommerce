import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVariantStock, ProductCard, type ProductCardData } from "@/components/product-card";
import { type ExpirySettings } from "@/lib/expiry";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

type BrandProduct = ProductCardData & { categories: { name: string } | null };

async function getBrand(slug: string) {
  const supabase = await createClient();
  const { data: brand } = await supabase.from("brands").select("id, name").eq("slug", slug).maybeSingle();
  if (!brand) return null;
  const { data } = await supabase
    .from("products")
    .select("id, slug, name, pet_type, highlights, size_display, categories(name), product_images(path, alt), variants(id, title, price)")
    .eq("brand_id", brand.id)
    .eq("status", "published")
    .order("name");
  const products = (data ?? []) as unknown as BrandProduct[];
  return products.length ? { name: brand.name as string, products } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return {};
  return {
    title: `${brand.name} – Shop Online in Malaysia`,
    description: `Shop ${brand.name} at ${site.name} in Rawang: ${brand.products.length} product${brand.products.length === 1 ? "" : "s"} with same-day Klang Valley delivery or free store pickup.`,
    alternates: { canonical: `/brands/${slug}` },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const supabase = await createClient();
  const [stock, { data: settingsRow }] = await Promise.all([
    getVariantStock(supabase, brand.products.flatMap((p) => p.variants.map((v) => v.id))),
    supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
  ]);
  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-choc-2">
        <Link href="/brands" className="hover:underline">
          Brands
        </Link>
        <span aria-hidden>/</span>
        <span className="text-choc">{brand.name}</span>
      </nav>
      <h1 className="font-bubble text-3xl font-extrabold text-choc">{brand.name}</h1>
      <p className="mt-3 max-w-3xl text-choc">
        Shop {brand.name} at {site.name} in Rawang. Order online for same-day delivery in the Klang Valley, or pick
        up free at our shop in Bukit Beruntung.
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {brand.products.map((p) => (
          <li key={p.id}>
            <ProductCard
              product={{ ...p, categoryLabel: p.categories?.name }}
              stock={stock}
              expirySettings={expirySettings}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
