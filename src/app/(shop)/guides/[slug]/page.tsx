import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGuide, guides, type Guide } from "@/lib/guides";
import { createPublicClient } from "@/lib/supabase/public";
import { cheapestBigBags } from "@/lib/budget-food";
import { titleCase } from "@/lib/seo";

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

/** In-stock dry food in big bags, cheapest per kg first (makanan anjing / kucing murah guides). */
async function budgetFood({ pet, minKg, maxPerKg }: NonNullable<Guide["table"]>) {
  const db = createPublicClient();
  const { data } = await db
    .from("variants")
    .select("id, title, price, products!inner(slug, name, status, pet_type, categories!inner(slug))")
    .eq("products.status", "published")
    .eq("products.categories.slug", "dry-food")
    .in("products.pet_type", [pet, "dog_cat"]);
  const rows = (data ?? []) as unknown as { id: string; title: string; price: number; products: { slug: string; name: string } }[];
  const { data: stock } = await db.rpc("variant_stock", { p_variant_ids: rows.map((r) => r.id) });
  const available = new Map(((stock ?? []) as { variant_id: string; available: number }[]).map((s) => [s.variant_id, s.available]));
  return cheapestBigBags(
    rows.map((r) => ({ slug: r.products.slug, name: r.products.name, title: r.title, price: Number(r.price), available: available.get(r.id) ?? 0 })),
    minKg,
    6,
    maxPerKg,
  );
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
  const bags = guide.table ? await budgetFood(guide.table).catch(() => []) : [];
  const faqLd = guide.faq && {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/guides" className="text-sm font-semibold text-rust">
        ← All guides
      </Link>
      <h1 className="mt-2 font-bubble text-3xl font-extrabold text-choc">{guide.title}</h1>
      <p className="mt-3 text-choc-2">{guide.intro}</p>

      {bags.length > 0 && (
        <ol className="mt-6 grid gap-2">
          {bags.map((b, i) => (
            <li key={b.slug}>
              <Link
                href={`/shop/${b.slug}`}
                className="flex items-center justify-between gap-3 rounded-2xl card-soft bg-surface p-4 hover:bg-cream"
              >
                <span className="grid min-w-0">
                  <span className="text-xs font-bold text-rust">#{i + 1} · {b.kg} kg</span>
                  <span className="font-bold text-choc">{titleCase(b.name)}</span>
                  <span className="text-sm text-choc-2">RM{b.price.toFixed(2)} sebeg</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-bubble text-xl font-extrabold text-choc">RM{b.perKg.toFixed(2)}</span>
                  <span className="text-xs text-choc-2">sekilo</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 grid gap-6">
        {guide.sections.map((s) => (
          <div key={s.heading} className="grid gap-1.5">
            <h2 className="font-bubble text-xl font-extrabold text-choc">{s.heading}</h2>
            <p className="text-choc-2">{s.body}</p>
          </div>
        ))}
      </div>

      {guide.faq && (
        <div className="mt-8 grid gap-4">
          <h2 className="font-bubble text-xl font-extrabold text-choc">Soalan lazim</h2>
          {guide.faq.map((f) => (
            <div key={f.q} className="grid gap-1">
              <h3 className="font-bold text-choc">{f.q}</h3>
              <p className="text-choc-2">{f.a}</p>
            </div>
          ))}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
        </div>
      )}

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
