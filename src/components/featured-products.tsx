import { ArrowRight, PawPrint } from "lucide-react";
import Link from "next/link";
import { formatMyr } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  slug: string;
  name: string;
  size_display: string | null;
  product_images: { path: string; alt: string | null }[];
  variants: { price: number }[];
};

/** Four real published products, cheapest variant shown — no fabricated bestseller/rating badges. */
export async function FeaturedProducts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, slug, name, size_display, product_images(path, alt), variants(price)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(4);
  const products = (data ?? []) as unknown as Row[];
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="featured-heading" className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex items-center justify-between">
        <h2 id="featured-heading" className="font-bubble text-2xl font-extrabold text-choc">
          Featured products
        </h2>
        <Link href="/shop" className="flex items-center gap-1 text-sm font-bold text-rust">
          View all <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((p) => {
          const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null;
          const image = p.product_images[0];
          return (
            <li key={p.id}>
              <Link
                href={`/shop/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-choc bg-surface shadow-[3px_3px_0_0_var(--color-choc)] transition-transform hover:-translate-y-0.5"
              >
                <div className="flex aspect-square items-center justify-center bg-peach/40">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.path} alt={image.alt ?? p.name} className="size-full object-cover" />
                  ) : (
                    <PawPrint className="size-10 text-rust/50" aria-hidden />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
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
    </section>
  );
}
