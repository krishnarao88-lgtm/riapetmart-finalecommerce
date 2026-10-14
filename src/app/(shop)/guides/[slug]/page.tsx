import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGuide, guides, type Guide } from "@/lib/guides";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

/**
 * Real product pages for the guide's shop links (pet/category filters, NexGard for /flea-tick). Guides are already
 * indexed, so these links are how Google finds product pages it has "discovered" but not yet crawled.
 */
async function guideProducts(links: Guide["shopLinks"]) {
  const db = createPublicClient();
  const picks = new Map<string, string>();
  for (const { href } of links) {
    const url = new URL(href, "https://x");
    const pet = url.searchParams.get("pet");
    const category = url.searchParams.get("category");
    const brand = url.pathname === "/flea-tick" ? "nexgard" : null;
    if (!pet && !category && !brand) continue;
    const select = ["slug, name", category && "categories!inner(slug)", brand && "brands!inner(slug)"].filter(Boolean).join(", ");
    let q = db.from("products").select(select).eq("status", "published").limit(4);
    if (pet) q = q.in("pet_type", [pet, "dog_cat"]);
    if (category) q = q.eq("categories.slug", category);
    if (brand) q = q.eq("brands.slug", brand);
    const { data } = await q;
    for (const p of (data ?? []) as unknown as { slug: string; name: string }[]) picks.set(p.slug, p.name);
  }
  return [...picks].slice(0, 8);
}

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.description, alternates: { canonical: `/guides/${slug}` } };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const products = await guideProducts(guide.shopLinks).catch(() => []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/guides" className="text-sm font-semibold text-rust">
        ← All guides
      </Link>
      <h1 className="mt-2 font-bubble text-3xl font-extrabold text-choc">{guide.title}</h1>
      <p className="mt-3 text-choc-2">{guide.intro}</p>

      <div className="mt-6 grid gap-6">
        {guide.sections.map((s) => (
          <div key={s.heading} className="grid gap-1.5">
            <h2 className="font-bubble text-xl font-extrabold text-choc">{s.heading}</h2>
            <p className="text-choc-2">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-2 rounded-2xl card-soft bg-peach/40 p-5">
        <p className="font-bold text-choc">Shop what&apos;s in this guide</p>
        <div className="flex flex-wrap gap-2">
          {guide.shopLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1 rounded-full border-2 border-choc bg-terracotta px-4 py-2 text-sm font-bold text-cream"
            >
              {link.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
          ))}
        </div>
        {products.length > 0 && (
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {products.map(([slug, name]) => (
              <li key={slug}>
                <Link href={`/shop/${slug}`} className="font-semibold text-rust underline">
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
