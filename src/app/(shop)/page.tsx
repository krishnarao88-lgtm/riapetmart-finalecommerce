import { Bike, PackageCheck, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { BestSellers } from "@/components/best-sellers";
import { CategoryQuickLinks } from "@/components/category-quick-links";
import { FeaturedProducts } from "@/components/featured-products";
import { BrandMarquee } from "@/components/brand-marquee";
import { CareHub } from "@/components/care-hub";
import { Hero } from "@/components/hero";
import { InstagramFeed } from "@/components/instagram-feed";
import { LocalSeo } from "@/components/local-seo";
import { PetCollage } from "@/components/pet-collage";
import { PromoBanner } from "@/components/promo-banner";
import { ShortDatedDeals } from "@/components/short-dated-deals";
import { Testimonial } from "@/components/testimonial";
import { TikTokFeed } from "@/components/tiktok-feed";
import { TRUST_POINTS } from "@/components/trust-line";
import { TrustStats } from "@/components/trust-stats";
import { createPublicClient } from "@/lib/supabase/public";

// Served from a cached copy rebuilt at most once a minute; product pages, cart and checkout stay live.
export const revalidate = 60;

const promises = [
  TRUST_POINTS[0],
  TRUST_POINTS[1],
  { Icon: Bike, title: "Order by 1pm, delivered today", body: "Mon–Sat in Selangor, KL and Putrajaya by Lalamove, or your delivery fee back." },
  { Icon: PackageCheck, title: "Nationwide courier", body: "The cheapest courier to every other state." },
  { Icon: Store, title: "Free store pickup", body: "Bukit Beruntung, Rawang. Mon–Sat 10:00–19:00." },
  { Icon: ShieldCheck, title: "Secure checkout", body: "FPX online banking, GrabPay, cards, Apple Pay and Google Pay." },
];

export default async function Home() {
  const supabase = createPublicClient();
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  return (
    <>
      <Hero />
      <CategoryQuickLinks />
      <PromoBanner />
      <ShortDatedDeals />
      <section aria-label="Flea and tick protection" className="mx-auto max-w-6xl px-4 pt-8">
        <Link
          href="/flea-tick"
          className="flex flex-wrap items-center justify-between gap-3 rounded-3xl card-soft bg-peach/40 px-5 py-4 transition-transform hover:-translate-y-0.5"
        >
          <span className="grid">
            <span className="font-bubble text-lg font-extrabold text-choc">Flea &amp; tick season? Protect them monthly</span>
            <span className="text-sm text-choc-2">NexGard for dogs &amp; cats · pick the right size by weight</span>
          </span>
          <span className="btn-bubble bg-rust px-4 py-2 text-sm text-cream">Find their size →</span>
        </Link>
      </section>
      <FeaturedProducts />
      <BestSellers />
      <TrustStats publishedProductCount={count ?? 0} />
      <PetCollage />
      <BrandMarquee />
      <CareHub />
      <Testimonial />
      <InstagramFeed />
      <TikTokFeed />

      <section aria-label="Why shop with us" className="mx-auto max-w-6xl px-4 pb-14 pt-6">
        <ul className="grid gap-4 rounded-3xl card-soft bg-cream p-5 sm:grid-cols-2 lg:grid-cols-3">
          {promises.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-peach">
                <Icon className="size-5 text-rust" aria-hidden />
              </span>
              <span className="grid gap-0.5">
                <span className="font-bold text-choc">{title}</span>
                <span className="text-sm text-choc-2">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <LocalSeo />
    </>
  );
}
