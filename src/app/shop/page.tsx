import { Search } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Shop all",
  description:
    "Browse dog food, cat food, treats, grooming and health supplies at Ria Pet Mart — pet shop Rawang and Bukit Beruntung, with delivery across Malaysia.",
  keywords: ["dog food Malaysia", "cat food Malaysia", "pet shop Rawang", "kedai haiwan Rawang", "cat litter Malaysia"],
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
  // categories!inner makes the category filter actually restrict rows — a plain embed
  // only filters the nested object, not which products are returned.
  const categoriesEmbed = category ? "categories!inner(name, slug)" : "categories(name)";
  let productsQuery = supabase
    .from("products")
    .select(
      `id, slug, name, pet_type, size_display, ${categoriesEmbed}, product_images(path, alt), variants(id, title, price, stock_batches(expiry_date))`,
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

  const current = { pet, category, deal, q };
  const filterHref = (overrides: Partial<typeof current>) => {
    const next = { ...current, ...overrides };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

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
          <div className="mt-2 flex flex-wrap gap-2">
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
          </div>
        </details>

        <div className="hidden md:block">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-choc-2">Category</p>
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-3xl border-2 border-choc bg-cream p-8 text-center text-choc-2">
          No products match this filter yet — check back soon.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((p) => (
            <li key={p.id}>
              <ProductCard
                product={{ ...p, categoryLabel: p.categories?.name ?? p.pet_type }}
                expirySettings={expirySettings}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
