import type { Metadata } from "next";
import { Cat, Dog, FlaskConical, Info, PawPrint, Pill, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ProductTags } from "@/components/product-tags";
import { getVariantStock } from "@/components/product-card";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { formatMyr } from "@/lib/pricing";
import { TrackViewItem } from "@/components/track-view-item";
import { productDescription, productTitle, titleCase } from "@/lib/seo";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

async function getProduct(slug: string) {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, description, ingredients, usage, highlights, is_dvs_approved, size_display, pet_type, category_id, is_regulated, seo_title, seo_description, brands(name, slug), categories(name, slug), product_images(path, alt, sort), variants(id, title, price, sort)",
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
  const prices = (product.variants ?? []).map((v) => v.price);
  const name = titleCase(product.name);
  const seoTitle = product.seo_title?.trim();
  const description =
    product.seo_description?.trim() || productDescription(product.name, prices.length ? Math.min(...prices) : null);

  return {
    // The layout template appends " · Ria Pet Mart", so a hand-written title that already names the shop is used as-is.
    title: seoTitle ? (seoTitle.includes(site.name) ? { absolute: seoTitle } : seoTitle) : productTitle(product.name),
    description,
    alternates: { canonical: `/shop/${slug}` },
    openGraph: {
      title: name,
      description,
      siteName: site.name,
      locale: "en_MY",
      url: `/shop/${slug}`,
      // A page-level openGraph replaces the layout's, so products without a photo name the default share image.
      images: image ? [{ url: image.path, alt: name }] : ["/opengraph-image"],
    },
  };
}

/** Dosage lines that start with a pet get that pet's icon, so dog and cat doses are easy to tell apart. */
function usageIcon(line: string) {
  if (/^dogs? (and|&) cats?\b/i.test(line)) return PawPrint;
  if (/^(dogs?|puppy|puppies|adult dogs?)\b/i.test(line)) return Dog;
  if (/^(cats?|kittens?)\b/i.test(line)) return Cat;
  return Info;
}

function InfoSection({ icon: Icon, title, text }: { icon: typeof Info; title: string; text: string | null }) {
  if (!text) return null;
  return (
    <section className="grid gap-1.5 rounded-2xl bg-peach/30 p-4">
      <h2 className="flex items-center gap-2 font-bold text-choc">
        <Icon className="size-5 text-rust" aria-hidden /> {title}
      </h2>
      <p className="whitespace-pre-line text-sm text-choc-2">{text}</p>
    </section>
  );
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
  const [{ data: related }, stockMap, { data: reviews }] = await Promise.all([
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
    supabase.from("reviews").select("rating").eq("product_id", product.id).eq("status", "approved"),
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
  const image = images[0] ?? null;
  const name = titleCase(product.name);
  // Many-to-one embeds come back as a single object, not an array.
  const brandRow = product.brands as unknown as { name: string; slug: string } | null;
  const brand = brandRow?.name;
  const categoryRow = product.categories as unknown as { name: string; slug: string } | null;
  const category = categoryRow?.name;
  const petLabels: Record<string, string> = { dog: "Dogs", cat: "Cats", dog_cat: "Dogs & cats", small_pet: "Small pets" };
  const petLabel = petLabels[product.pet_type] ?? product.pet_type;
  // Variant id, matching the feed's g:id and the cart's add_to_cart/purchase events.
  const cheapest = [...variants].sort((a, b) => a.price - b.price)[0];
  const ratings = (reviews ?? []).map((r) => r.rating as number);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: product.description ?? undefined,
    image: image ? image.path : undefined,
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    category: category ?? undefined,
    offers: variants.length
      ? variants.map((v) => ({
          "@type": "Offer",
          name: v.title,
          priceCurrency: "MYR",
          price: v.price,
          // Left out when the stock lookup failed rather than guessed.
          availability:
            v.available === null
              ? undefined
              : v.available > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          url: `${site.url}/shop/${slug}`,
        }))
      : undefined,
    aggregateRating: ratings.length
      ? {
          "@type": "AggregateRating",
          ratingValue: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
          reviewCount: ratings.length,
        }
      : undefined,
  };

  const breadcrumbItems = [
    { name: "Shop", url: `${site.url}/shop` },
    { name: petLabel, url: `${site.url}/shop?pet=${product.pet_type}` },
    ...(categoryRow ? [{ name: categoryRow.name, url: `${site.url}/shop?category=${categoryRow.slug}` }] : []),
    { name, url: `${site.url}/shop/${slug}` },
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
        <span className="text-choc">{name}</span>
      </nav>
      {cheapest && <TrackViewItem id={cheapest.id} name={name} price={cheapest.price} />}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square max-h-[45vh] items-center justify-center rounded-3xl border-2 border-choc bg-peach/40 sm:max-h-none">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.path} alt={titleCase(image.alt || product.name)} className="size-full rounded-3xl object-cover" />
          ) : (
            <PawPrint className="size-16 text-rust/50" aria-hidden />
          )}
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-rust">
            {brandRow && (
              <Link href={`/brands/${brandRow.slug}`} className="hover:underline">
                {brandRow.name}
              </Link>
            )}
            {category && <span>· {category}</span>}
          </div>
          <h1 className="font-bubble text-2xl font-extrabold text-choc">{name}</h1>
          {product.size_display && <p className="text-choc-2">{product.size_display}</p>}
          <ProductTags petType={product.pet_type} highlights={product.highlights} />
          {product.is_dvs_approved && (
            <p className="flex w-fit items-center gap-2 rounded-xl bg-ok-bg px-3 py-2 text-sm font-semibold text-ok-fg">
              <ShieldCheck className="size-5 shrink-0" aria-hidden />
              Approved by the Department of Veterinary Services (DVS) Malaysia
            </p>
          )}

          {variants.some((v) => v.badge?.kind === "short-dated") && (
            <span className="w-fit rounded-full bg-rust px-3 py-1 text-xs font-bold text-cream">
              Short-dated — discount applied at checkout
            </span>
          )}

          <div className="mt-2 rounded-2xl border-2 border-choc bg-cream p-4">
            <AddToCart
              productSlug={slug}
              productName={name}
              image={image?.path ?? null}
              variants={variants}
            />
          </div>

          {product.is_regulated && (
            <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-fg">
              This is a regulated pet-health product. Follow the label and consult a vet if unsure.
            </p>
          )}

          <InfoSection icon={Target} title="What it's for" text={product.description} />
          <InfoSection icon={FlaskConical} title="Ingredients" text={product.ingredients} />
          {product.usage && (
            <section className="grid gap-2 rounded-2xl bg-peach/30 p-4">
              <h2 className="flex items-center gap-2 font-bold text-choc">
                <Pill className="size-5 text-rust" aria-hidden /> How to use
              </h2>
              <ul className="grid gap-1.5">
                {(product.usage as string)
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const Icon = usageIcon(line);
                    return (
                      <li key={line} className="flex gap-2 text-sm text-choc-2">
                        <Icon className="mt-0.5 size-4 shrink-0 text-rust" aria-hidden />
                        <span>{line}</span>
                      </li>
                    );
                  })}
              </ul>
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
                        <img src={relImage.path} alt={titleCase(relImage.alt || p.name)} className="size-full object-cover" />
                      ) : (
                        <PawPrint className="size-10 text-rust/50" aria-hidden />
                      )}
                    </div>
                    <div className="grid gap-1 p-3">
                      <span className="line-clamp-2 text-sm font-bold text-choc">{titleCase(p.name)}</span>
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
