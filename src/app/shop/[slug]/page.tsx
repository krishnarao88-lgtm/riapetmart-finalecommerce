import type { Metadata } from "next";
import { PawPrint } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { getVariantStock } from "@/components/product-card";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { formatMyr } from "@/lib/pricing";
import { titleCase } from "@/lib/seo";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

async function getProduct(slug: string) {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, description, ingredients, usage, size_display, pet_type, category_id, is_regulated, seo_title, seo_description, brands(name), categories(name, slug), product_images(path, alt, sort), variants(id, title, price, sort)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return product;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  const image = [...(product.product_images ?? [])].sort((a, b) => a.sort - b.sort)[0];
  const description =
    product.seo_description ??
    product.description?.slice(0, 160) ??
    `${product.name}${product.size_display ? ` — ${product.size_display}` : ""} at ${site.name}.`;

  return {
    title: product.seo_title ?? `${titleCase(product.name)} – Price in Malaysia`,
    description,
    alternates: { canonical: `/shop/${slug}` },
    openGraph: image ? { images: [{ url: image.path }] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, { data: settingsRow }] = await Promise.all([
    getProduct(slug),
    (await createClient()).from("settings").select("value").eq("key", "expiry_badges").single(),
  ]);

  if (!product) notFound();

  const supabase = await createClient();
  const rawVariants = [...(product.variants ?? [])].sort((a, b) => a.sort - b.sort);
  const [{ data: related }, stockMap] = await Promise.all([
    product.category_id
      ? supabase
          .from("products")
          .select("slug, name, product_images(path, alt), variants(price)")
          .eq("category_id", product.category_id)
          .eq("status", "published")
          .neq("id", product.id)
          .limit(4)
      : { data: null },
    getVariantStock(supabase, rawVariants.map((v) => v.id)),
  ]);

  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort - b.sort);
  const variants = rawVariants.map((v) => {
    const row = stockMap?.get(v.id);
    const badge = getExpiryBadge(row?.nearest_expiry ?? null, expirySettings);
    const price = badge?.kind === "short-dated" ? discountedPrice(v.price, badge.discount) : v.price;
    const available = stockMap ? (row?.available ?? 0) : null;
    return { id: v.id, title: v.title, price, originalPrice: v.price, badge, available };
  });
  const inStock = variants.some((v) => v.available !== 0);
  const image = images[0] ?? null;
  const brand = (product.brands as unknown as { name: string }[])?.[0]?.name;
  const categoryRow = (product.categories as unknown as { name: string; slug: string }[])?.[0];
  const category = categoryRow?.name;
  const petLabels: Record<string, string> = { dog: "Dogs", cat: "Cats", small_pet: "Small pets" };
  const petLabel = petLabels[product.pet_type] ?? product.pet_type;
  const cheapestPrice = variants.length ? Math.min(...variants.map((v) => v.price)) : null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: titleCase(product.name),
    description: product.description ?? undefined,
    image: image ? image.path : undefined,
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    category: category ?? undefined,
    offers:
      cheapestPrice !== null
        ? {
            "@type": "Offer",
            priceCurrency: "MYR",
            price: cheapestPrice,
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${site.url}/shop/${slug}`,
          }
        : undefined,
  };

  const breadcrumbItems = [
    { name: "Shop", url: `${site.url}/shop` },
    { name: petLabel, url: `${site.url}/shop?pet=${product.pet_type}` },
    ...(categoryRow ? [{ name: categoryRow.name, url: `${site.url}/shop?category=${categoryRow.slug}` }] : []),
    { name: product.name, url: `${site.url}/shop/${slug}` },
  ];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-choc-2">
        <Link href="/shop" className="hover:underline">
          Shop
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/shop?pet=${product.pet_type}`} className="hover:underline">
          {petLabel}
        </Link>
        {categoryRow && (
          <>
            <span aria-hidden>/</span>
            <Link href={`/shop?category=${categoryRow.slug}`} className="hover:underline">
              {categoryRow.name}
            </Link>
          </>
        )}
        <span aria-hidden>/</span>
        <span className="text-choc">{product.name}</span>
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square max-h-[45vh] items-center justify-center rounded-3xl border-2 border-choc bg-peach/40 sm:max-h-none">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.path} alt={image.alt ?? product.name} className="size-full rounded-3xl object-cover" />
          ) : (
            <PawPrint className="size-16 text-rust/50" aria-hidden />
          )}
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-rust">
            {brand && <span>{brand}</span>}
            {category && <span>· {category}</span>}
          </div>
          <h1 className="font-bubble text-2xl font-extrabold text-choc">{product.name}</h1>
          {product.size_display && <p className="text-choc-2">{product.size_display}</p>}

          {variants.some((v) => v.badge?.kind === "short-dated") && (
            <span className="w-fit rounded-full bg-rust px-3 py-1 text-xs font-bold text-cream">
              Short-dated — discount applied at checkout
            </span>
          )}

          <div className="mt-2 rounded-2xl border-2 border-choc bg-cream p-4">
            <AddToCart
              productSlug={slug}
              productName={product.name}
              image={image?.path ?? null}
              variants={variants}
            />
          </div>

          {product.is_regulated && (
            <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-fg">
              This is a regulated pet-health product. Follow the label and consult a vet if unsure.
            </p>
          )}

          {product.description && (
            <section className="grid gap-1">
              <h2 className="font-bold text-choc">Description</h2>
              <p className="text-sm text-choc-2">{product.description}</p>
            </section>
          )}
          {product.ingredients && (
            <section className="grid gap-1">
              <h2 className="font-bold text-choc">Ingredients</h2>
              <p className="text-sm text-choc-2">{product.ingredients}</p>
            </section>
          )}
          {product.usage && (
            <section className="grid gap-1">
              <h2 className="font-bold text-choc">Usage</h2>
              <p className="text-sm text-choc-2">{product.usage}</p>
            </section>
          )}
        </div>
      </div>

      {related && related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-bubble text-xl font-extrabold text-choc">More from {category ?? "this category"}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => {
              const price = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null;
              const relImage = p.product_images[0];
              return (
                <li key={p.slug}>
                  <Link
                    href={`/shop/${p.slug}`}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-choc bg-surface transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex aspect-square items-center justify-center bg-peach/40">
                      {relImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={relImage.path} alt={relImage.alt ?? p.name} className="size-full object-cover" />
                      ) : (
                        <PawPrint className="size-10 text-rust/50" aria-hidden />
                      )}
                    </div>
                    <div className="grid gap-1 p-3">
                      <span className="line-clamp-2 text-sm font-bold text-choc">{p.name}</span>
                      <span className="text-sm text-choc-2">
                        {price !== null ? `from ${formatMyr(price)}` : "Price on request"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
