import { Bike, PackageCheck, ShieldCheck, Store } from "lucide-react";
import { BestSellers } from "@/components/best-sellers";
import { CategoryQuickLinks } from "@/components/category-quick-links";
import { FeaturedProducts } from "@/components/featured-products";
import { BrandMarquee } from "@/components/brand-marquee";
import { GuidesTeaser } from "@/components/guides-teaser";
import { Hero } from "@/components/hero";
import { LocalSeo } from "@/components/local-seo";
import { PetCareTips } from "@/components/pet-care-tips";
import { PetCollage } from "@/components/pet-collage";
import { PromoBanner } from "@/components/promo-banner";
import { ShortDatedDeals } from "@/components/short-dated-deals";
import { Testimonial } from "@/components/testimonial";
import { TikTokFeed } from "@/components/tiktok-feed";
import { TrustStats } from "@/components/trust-stats";
import { createClient } from "@/lib/supabase/server";

const promises = [
  { Icon: Bike, title: "Same-day delivery", body: "Selangor, KL and Putrajaya by Lalamove." },
  { Icon: PackageCheck, title: "Nationwide courier", body: "The cheapest courier to every other state." },
  { Icon: Store, title: "Free store pickup", body: "Bukit Beruntung, Rawang. Mon–Sat 10:00–19:00." },
  { Icon: ShieldCheck, title: "Secure checkout", body: "FPX, cards, Apple Pay and Google Pay." },
];

export default async function Home() {
  const supabase = await createClient();
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
      <FeaturedProducts />
      <BestSellers />
      <TrustStats publishedProductCount={count ?? 0} />
      <PetCollage />
      <BrandMarquee />
      <PetCareTips />
      <GuidesTeaser />
      <Testimonial />
      <TikTokFeed />

      <section aria-label="Why shop with us" className="mx-auto max-w-6xl px-4 pb-14 pt-6">
        <ul className="grid gap-4 rounded-3xl card-soft bg-cream p-5 sm:grid-cols-2 lg:grid-cols-4">
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
