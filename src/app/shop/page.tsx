import { PawPrint } from "lucide-react";
import Link from "next/link";
import { formatMyr } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Shop all" };

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
  variants: { price: number }[];
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ pet?: string; category?: string }>;
}) {
  const { pet, category } = await searchParams;
  const supabase = await createClient();

  const categoriesQuery = supabase.from("categories").select("id, name, slug").order("sort");
  let productsQuery = supabase
    .from("products")
    .select(
      "id, slug, name, pet_type, size_display, categories(name), product_images(path, alt), variants(price)",
    )
    .eq("status", "published")
    .order("name");

  if (pet) productsQuery = productsQuery.or(`pet_type.eq.${pet},pet_type.eq.dog_cat`);
  if (category) productsQuery = productsQuery.eq("categories.slug", category);

  const [{ data: categories }, { data: products }] = await Promise.all([
    categoriesQuery,
    productsQuery,
  ]);

  const rows = (products ?? []) as unknown as ProductRow[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">Shop all</h1>
      <p className="mt-1 text-choc-2">{rows.length} product{rows.length === 1 ? "" : "s"}</p>

      <div className="mt-5 flex flex-wrap gap-2">
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
        {(categories ?? []).map((c) => (
          <Link
            key={c.slug}
            href={`/shop?category=${c.slug}${pet ? `&pet=${pet}` : ""}`}
            className={`rounded-full border-2 border-peach px-4 py-1.5 text-sm font-semibold ${category === c.slug ? "bg-peach text-choc" : "bg-cream text-choc-2"}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-3xl border-2 border-choc bg-cream p-8 text-center text-choc-2">
          No products match this filter yet — check back soon.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((p) => {
            const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null;
            const image = p.product_images[0];
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
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-rust">
                      {p.categories?.name ?? p.pet_type}
                    </span>
                    <span className="line-clamp-2 text-sm font-bold text-choc">{p.name}</span>
                    {p.size_display && <span className="text-xs text-choc-2">{p.size_display}</span>}
                    <span className="mt-auto pt-1 font-bold text-choc">
                      {minPrice !== null ? `from ${formatMyr(minPrice)}` : "Price on request"}
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
