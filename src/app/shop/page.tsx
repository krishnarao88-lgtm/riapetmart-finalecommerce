import { PawPrint, Search } from "lucide-react";
import Link from "next/link";
import { QuickAddButton } from "@/components/quick-add-button";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { formatMyr } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Shop all",
  description: "Browse pet food, treats, grooming and health supplies for dogs, cats and small pets at Ria Pet Mart.",
  alternates: { canonical: "/shop" },
};

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
  size_display: string | null;
  categories: { name: string } | null;
  product_images: { path: string; alt: string | null }[];
  variants: { id: string; title: string; price: number; stock_batches: { expiry_date: string | null }[] }[];
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ pet?: string; category?: string; deal?: string; q?: string }>;
}) {
  const { pet, category, deal, q } = await searchParams;
  const supabase = await createClient();

  const categoriesQuery = supabase.from("categories").select("id, name, slug").order("sort");
  const settingsQuery = supabase.from("settings").select("value").eq("key", "expiry_badges").single();
  let productsQuery = supabase
    .from("products")
    .select(
      "id, slug, name, pet_type, size_display, categories(name), product_images(path, alt), variants(id, title, price, stock_batches(expiry_date))",
    )
    .eq("status", "published")
    .order("name");

  if (pet) productsQuery = productsQuery.or(`pet_type.eq.${pet},pet_type.eq.dog_cat`);
  if (category) productsQuery = productsQuery.eq("categories.slug", category);
  if (q) productsQuery = productsQuery.ilike("name", `%${q}%`);

  const [{ data: categories }, { data: settingsRow }, { data: products }] = await Promise.all([
    categoriesQuery,
    settingsQuery,
    productsQuery,
  ]);

  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
  let rows = (products ?? []) as unknown as ProductRow[];

  const withBadge = rows.map((p) => {
    const expiries = p.variants.flatMap((v) => v.stock_batches.map((b) => b.expiry_date)).filter(Boolean) as string[];
    const nearest = expiries.sort()[0] ?? null;
    return { product: p, badge: getExpiryBadge(nearest, expirySettings) };
  });

  if (deal === "short-dated") {
    rows = withBadge.filter((r) => r.badge?.kind === "short-dated").map((r) => r.product);
  }
  const badgeByProductId = new Map(withBadge.map((r) => [r.product.id, r.badge]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">Shop all</h1>
      <p className="mt-1 text-choc-2">{rows.length} product{rows.length === 1 ? "" : "s"}</p>

      <form className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-choc-2" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search products…"
          className="w-full rounded-full border-2 border-choc bg-cream py-2 pl-9 pr-4 text-sm text-choc placeholder:text-choc-2/70"
        />
        {pet && <input type="hidden" name="pet" value={pet} />}
        {category && <input type="hidden" name="category" value={category} />}
        {deal && <input type="hidden" name="deal" value={deal} />}
      </form>

      <div className="mt-5 grid gap-3">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-choc-2">Pet</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/shop"
              className={`rounded-full border-2 border-choc px-4 py-1.5 text-sm font-semibold ${!pet ? "bg-terracotta text-cream" : "bg-cream text-choc"}`}
            >
              All pets
            </Link>
            {petFilters.map((f) => (
              <Link
                key={f.value}
                href={`/shop?pet=${f.value}`}
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
          <div className="mt-2 flex flex-wrap gap-2">
            {(categories ?? []).map((c) => (
              <Link
                key={c.slug}
                href={`/shop?category=${c.slug}${pet ? `&pet=${pet}` : ""}`}
                className={`rounded-full border-2 border-peach px-4 py-1.5 text-sm font-semibold ${category === c.slug ? "bg-peach text-choc" : "bg-cream text-choc-2"}`}
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/shop?deal=short-dated"
              className={`rounded-full border-2 border-rust px-4 py-1.5 text-sm font-semibold ${deal === "short-dated" ? "bg-rust text-cream" : "bg-cream text-rust"}`}
            >
              Clearance
            </Link>
          </div>
        </details>

        <div className="hidden md:block">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-choc-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {(categories ?? []).map((c) => (
              <Link
                key={c.slug}
                href={`/shop?category=${c.slug}${pet ? `&pet=${pet}` : ""}`}
                className={`rounded-full border-2 border-peach px-4 py-1.5 text-sm font-semibold ${category === c.slug ? "bg-peach text-choc" : "bg-cream text-choc-2"}`}
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/shop?deal=short-dated"
              className={`rounded-full border-2 border-rust px-4 py-1.5 text-sm font-semibold ${deal === "short-dated" ? "bg-rust text-cream" : "bg-cream text-rust"}`}
            >
              Clearance
            </Link>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-3xl border-2 border-choc bg-cream p-8 text-center text-choc-2">
          No products match this filter yet — check back soon.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((p) => {
            const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null;
            const cheapestVariant = [...p.variants].sort((a, b) => a.price - b.price)[0] ?? null;
            const image = p.product_images[0];
            const badge = badgeByProductId.get(p.id);
            const showPrice =
              minPrice !== null && badge?.kind === "short-dated" ? discountedPrice(minPrice, badge.discount) : minPrice;
            return (
              <li key={p.id}>
                <Link
                  href={`/shop/${p.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-choc bg-surface shadow-[3px_3px_0_0_var(--color-choc)] transition-transform hover:-translate-y-0.5"
                >
                  <div className="relative flex aspect-square items-center justify-center bg-peach/40">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.path} alt={image.alt ?? p.name} className="size-full object-cover" />
                    ) : (
                      <PawPrint className="size-10 text-rust/50" aria-hidden />
                    )}
                    {badge?.kind === "short-dated" && (
                      <span className="absolute left-2 top-2 rounded-full bg-rust px-2 py-0.5 text-xs font-bold text-cream">
                        -{Math.round(badge.discount * 100)}% short-dated
                      </span>
                    )}
                    {badge?.kind === "fresh" && (
                      <span className="absolute left-2 top-2 rounded-full bg-ok-bg px-2 py-0.5 text-xs font-bold text-ok-fg">
                        Fresh stock
                      </span>
                    )}
                    {cheapestVariant && showPrice !== null && (
                      <QuickAddButton
                        variantId={cheapestVariant.id}
                        productSlug={p.slug}
                        productName={p.name}
                        variantTitle={cheapestVariant.title}
                        price={showPrice}
                        image={image?.path ?? null}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-rust">
                      {p.categories?.name ?? p.pet_type}
                    </span>
                    <span className="line-clamp-2 text-sm font-bold text-choc">{p.name}</span>
                    {p.size_display && <span className="text-xs text-choc-2">{p.size_display}</span>}
                    <span className="mt-auto flex items-baseline gap-2 pt-1">
                      {badge?.kind === "short-dated" && minPrice !== null && (
                        <span className="text-xs text-choc-2 line-through">{formatMyr(minPrice)}</span>
                      )}
                      <span className="font-bold text-choc">
                        {showPrice !== null ? `from ${formatMyr(showPrice)}` : "Price on request"}
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
