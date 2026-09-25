import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pet Food Brands",
  description:
    "Every pet food and supplies brand we sell online at Ria Pet Mart, Rawang. Same-day Klang Valley delivery or free store pickup.",
  alternates: { canonical: "/brands" },
};

export default async function BrandsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("slug, name, products!inner(id)")
    .eq("products.status", "published")
    .order("name");
  const brands = (data ?? []) as unknown as { slug: string; name: string; products: { id: string }[] }[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">Brands</h1>
      <p className="mt-1 text-choc-2">
        {brands.length} brand{brands.length === 1 ? "" : "s"} available online, with more on the shelves in our Rawang shop.
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {brands.map((b) => (
          <li key={b.slug}>
            <Link
              href={`/brands/${b.slug}`}
              className="flex h-full flex-col rounded-2xl card-soft bg-surface p-4 transition-transform hover:-translate-y-0.5"
            >
              <span className="font-bold text-choc">{b.name}</span>
              <span className="text-sm text-choc-2">
                {b.products.length} product{b.products.length === 1 ? "" : "s"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
