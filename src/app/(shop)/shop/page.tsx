import { careNeeds, NEED_LABELS } from "@/lib/care-needs";
import { MessageCircle, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getVariantStock, ProductCard, productStock } from "@/components/product-card";
import { SortSelect } from "@/components/sort-select";
import { type ExpirySettings } from "@/lib/expiry";
import { faqJsonLd, landingSeo } from "@/lib/seo";
import { searchTerm, sortByPrice } from "@/lib/shop-search";
import { whatsappLink } from "@/lib/site";
import { withPromos } from "@/lib/promotions-server";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

type ShopSearchParams = Promise<{ pet?: string; category?: string; deal?: string; q?: string; sort?: string; need?: string; stock?: string }>;

const shopAllMetadata: Metadata = {
  title: "Shop all",
  description:
    "Browse dog food, cat food, treats, grooming and health supplies at Ria Pet Mart, the pet shop in Rawang and Bukit Beruntung, with delivery across Malaysia.",
  keywords: ["online pet shop Malaysia", "dog food Malaysia", "cat food Malaysia", "pet shop Rawang", "kedai haiwan Rawang"],
  alternates: { canonical: "/shop" },
};

// Category and pet filters are landing pages in their own right (e.g. "cat food Malaysia"),
// so each gets its own title and canonical. Searches and deals stay out of the index, and a
// landing page with no live products is noindexed until products are published.
export async function generateMetadata({ searchParams }: { searchParams: ShopSearchParams }): Promise<Metadata> {
  const { pet, category, deal, q, need } = await searchParams;
  if (q || deal || need) return { ...shopAllMetadata, robots: { index: false, follow: true } };

  const seo = landingSeo(category, pet);
  if (!seo) return shopAllMetadata;

  const supabase = createPublicClient();
  const { count } = category
    ? await supabase
        .from("products")
        .select("id, categories!inner(slug)", { count: "exact", head: true })
        .eq("status", "published")
        .eq("categories.slug", category)
    : await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .in("pet_type", [pet ?? "", "dog_cat"]);

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.alsoSearched,
    alternates: { canonical: category ? `/shop?category=${category}` : `/shop?pet=${pet}` },
    robots: count ? undefined : { index: false, follow: true },
  };
}

const petFilters = [
  { value: "dog", label: "Dogs" },
  { value: "cat", label: "Cats" },
  { value: "small_pet", label: "Small pets" },
];

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  pet_type: string;
  highlights: string[] | null;
  size_display: string | null;
  categories: { name: string } | null;
  product_images: { path: string; alt: string | null }[];
  variants: { id: string; title: string; price: number }[];
};

/**
 * The shop grid's data for one filter combination, cached for a minute. Busy sale days then cost one
 * database round-trip per filter per minute instead of one per visitor; checkout still re-checks live.
 */
const loadShop = unstable_cache(
  async (pet: string | undefined, category: string | undefined, term: string | undefined) => {
    const supabase = createPublicClient();
    // q matches the product name, its brand or its category: resolve brand/category names to ids first,
    // since PostgREST can't OR a parent column with an embedded table's column.
    const [{ data: brandHits }, { data: categoryHits }] = term
      ? await Promise.all([
          supabase.from("brands").select("id").ilike("name", `%${term}%`),
          supabase.from("categories").select("id").ilike("name", `%${term}%`),
        ])
      : [{ data: null }, { data: null }];

    const categoriesQuery = supabase.from("categories").select("id, name, slug").order("sort");
    const settingsQuery = supabase.from("settings").select("value").eq("key", "expiry_badges").single();
    // categories!inner makes the category filter actually restrict rows — a plain embed
    // only filters the nested object, not which products are returned.
    const categoriesEmbed = category ? "categories!inner(name, slug)" : "categories(name)";
    let productsQuery = supabase
      .from("products")
      .select(
        `id, slug, name, pet_type, highlights, is_dvs_approved, size_display, brand_id, category_id, brands(is_house_brand), ${categoriesEmbed}, product_images(path, alt), variants(id, title, price)`,
      )
      .eq("status", "published")
      .order("name");

    if (pet) productsQuery = productsQuery.or(`pet_type.eq.${pet},pet_type.eq.dog_cat`);
    if (category) productsQuery = productsQuery.eq("categories.slug", category);
    if (term) {
      const brandIds = (brandHits ?? []).map((b) => b.id);
      const categoryIds = (categoryHits ?? []).map((c) => c.id);
      productsQuery = productsQuery.or(
        [
          `name.ilike.%${term}%`,
          brandIds.length && `brand_id.in.(${brandIds.join(",")})`,
          categoryIds.length && `category_id.in.(${categoryIds.join(",")})`,
        ]
          .filter(Boolean)
          .join(","),
      );
    }

    const [{ data: categories }, { data: settingsRow }, { data: products }] = await Promise.all([
      categoriesQuery,
      settingsQuery,
      productsQuery,
    ]);

    const rows = await withPromos((products ?? []) as unknown as ProductRow[]);

    const stock = await getVariantStock(supabase, rows.flatMap((p) => p.variants.map((v) => v.id)));
    return {
      categories: categories ?? [],
      expiry: (settingsRow?.value ?? {}) as Partial<ExpirySettings>,
      rows,
      stock: stock ? [...stock] : null,
    };
  },
  ["shop-grid"],
  { revalidate: 60 },
);

export default async function ShopPage({ searchParams }: { searchParams: ShopSearchParams }) {
  const { pet, category, deal, q, sort, need, stock: stockParam } = await searchParams;
  const showSoldOut = stockParam === "all";
  const needLabel = need ? NEED_LABELS[need] : undefined;
  const seo = q || deal || need ? null : landingSeo(category, pet);
  const term = searchTerm(q);
  const data = await loadShop(pet, category, term);
  const { categories, expiry: expirySettings } = data;
  let rows = sortByPrice(data.rows, sort);
  const stock = data.stock ? new Map(data.stock) : null;

  if (deal === "sale") rows = rows.filter((p) => p.promo);
  if (needLabel) rows = rows.filter((p) => careNeeds({ name: p.name, highlights: p.highlights ?? null }).has(need!));
  // Sold-out products stay reachable (and indexed) on their own pages, but the grid shows what can
  // be bought now unless the shopper asks for everything.
  const inStock = (p: (typeof rows)[number]) => productStock(p.variants, stock, expirySettings).available !== 0;
  const soldOutCount = stock ? rows.filter((p) => !inStock(p)).length : 0;
  if (!showSoldOut && stock) rows = rows.filter(inStock);
  if (deal === "short-dated") {
    rows = rows.filter((p) => productStock(p.variants, stock, expirySettings).badge?.kind === "short-dated");
  }

  const current = { pet, category, deal, q, sort, need, stock: stockParam };
  const filterHref = (overrides: Partial<typeof current>) => {
    const next = { ...current, ...overrides };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  const categoryChips = (
    <>
      {(categories ?? []).map((c) => (
        <Link
          key={c.slug}
          href={filterHref({ category: category === c.slug ? undefined : c.slug })}
          className={`rounded-full border-2 border-peach px-4 py-1.5 text-sm font-semibold ${category === c.slug ? "bg-peach text-choc" : "bg-cream text-choc-2"}`}
        >
          {c.name}
        </Link>
      ))}
      <Link
        href={filterHref({ deal: deal === "short-dated" ? undefined : "short-dated" })}
        className={`rounded-full border-2 border-rust px-4 py-1.5 text-sm font-semibold ${deal === "short-dated" ? "bg-rust text-cream" : "bg-cream text-rust"}`}
      >
        Clearance
      </Link>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {seo && seo.faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(seo.faqs)) }} />
      )}
      <h1 className="font-bubble text-3xl font-extrabold text-choc">{seo?.h1 ?? (needLabel ? `Shop for ${needLabel.toLowerCase()}` : "Shop all")}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-choc-2">
        <span>
          {rows.length} product{rows.length === 1 ? "" : "s"}
          {!showSoldOut && soldOutCount > 0 ? " in stock" : ""}
        </span>
        {soldOutCount > 0 && (
          <Link href={filterHref({ stock: showSoldOut ? undefined : "all" })} className="text-sm font-semibold text-rust underline">
            {showSoldOut ? "Hide sold-out items" : `Show ${soldOutCount} sold-out`}
          </Link>
        )}
      </p>
      {seo && (
        <div className="mt-3 grid max-w-3xl gap-1.5">
          <p className="text-choc">{seo.intro}</p>
          <p className="text-xs text-choc-2">Also searched as: {seo.alsoSearched.join(" · ")}</p>
          {seo.guide && (
            <Link href={`/guides/${seo.guide.slug}`} className="w-fit text-sm font-bold text-rust underline">
              Read: {seo.guide.label}
            </Link>
          )}
        </div>
      )}

      <form role="search" className="mt-4 flex max-w-xl flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-choc-2" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            key={q}
            placeholder="Search products, brands, categories…"
            aria-label="Search products"
            className="w-full rounded-full border-2 border-choc bg-cream py-2 pl-9 pr-4 text-sm text-choc placeholder:text-choc-2/70"
          />
        </div>
        <SortSelect key={sort} value={sort ?? ""} />
        {pet && <input type="hidden" name="pet" value={pet} />}
        {category && <input type="hidden" name="category" value={category} />}
        {deal && <input type="hidden" name="deal" value={deal} />}
      </form>

      <div className="mt-5 grid gap-3">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-choc-2">Pet</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={filterHref({ pet: undefined })}
              className={`rounded-full border-2 border-choc px-4 py-1.5 text-sm font-semibold ${!pet ? "bg-terracotta text-cream" : "bg-cream text-choc"}`}
            >
              All pets
            </Link>
            {petFilters.map((f) => (
              <Link
                key={f.value}
                href={filterHref({ pet: f.value })}
                className={`rounded-full border-2 border-choc px-4 py-1.5 text-sm font-semibold ${pet === f.value ? "bg-terracotta text-cream" : "bg-cream text-choc"}`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        <details className="md:hidden">
          <summary className="mb-1.5 cursor-pointer text-xs font-bold uppercase tracking-widest text-choc-2">
            Category
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">{categoryChips}</div>
        </details>

        <div className="hidden md:block">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-choc-2">Category</p>
          <div className="flex flex-wrap gap-2">{categoryChips}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 grid justify-items-center gap-3 rounded-3xl card-soft bg-cream p-8 text-center">
          <p className="text-choc-2">No products match this filter online yet.</p>
          <p className="max-w-md text-choc">
            Many more products are on the shelves at our Rawang shop. Ask us on WhatsApp and we&apos;ll deliver it or
            keep it for pickup.
          </p>
          <a
            href={whatsappLink(`Hi Ria Pet Mart, do you have ${seo?.h1.toLowerCase() ?? q ?? "this"} in stock?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-bubble bg-terracotta px-6 py-2.5 text-cream"
          >
            <MessageCircle className="size-5" aria-hidden />
            Ask on WhatsApp
          </a>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((p, i) => (
            <li key={p.id} style={{ "--i": i % 4 } as React.CSSProperties}>
              <ProductCard
                product={{ ...p, categoryLabel: p.categories?.name ?? p.pet_type }}
                stock={stock}
                expirySettings={expirySettings}
              />
            </li>
          ))}
        </ul>
      )}

      {seo && seo.faqs.length > 0 && (
        <section aria-labelledby="faq-heading" className="mt-12 grid max-w-3xl gap-3">
          <h2 id="faq-heading" className="font-bubble text-xl font-extrabold text-choc">
            Questions pet owners ask
          </h2>
          {seo.faqs.map((faq) => (
            <details key={faq.q} className="rounded-2xl border border-choc/30 bg-surface p-4">
              <summary className="cursor-pointer font-bold text-choc">{faq.q}</summary>
              <p className="mt-2 text-sm text-choc-2">{faq.a}</p>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
