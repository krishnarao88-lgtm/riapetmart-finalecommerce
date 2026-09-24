import type { MetadataRoute } from "next";
import { guides } from "@/lib/guides";
import { categorySeo, petSeo } from "@/lib/seo";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("slug, pet_type, categories(slug)")
    .eq("status", "published");

  const staticPages = ["", "/shop", "/about", "/contact", "/returns", "/privacy", "/terms", "/reviews", "/guides", "/cat-hotel"].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: (path === "/shop" ? "daily" : "monthly") as "daily" | "monthly",
  }));
  const productPages = (products ?? []).map((p) => ({
    url: `${site.url}/shop/${p.slug}`,
    changeFrequency: "weekly" as const,
  }));
  const guidePages = guides.map((g) => ({
    url: `${site.url}/guides/${g.slug}`,
    changeFrequency: "monthly" as const,
  }));

  // Only landing pages that have live products; empty ones are noindexed on the page itself.
  const rows = (products ?? []) as unknown as { pet_type: string; categories: { slug: string } | null }[];
  const categorySlugs = new Set(rows.map((p) => p.categories?.slug).filter((s): s is string => Boolean(s)));
  const petTypes = new Set(rows.flatMap((p) => (p.pet_type === "dog_cat" ? ["dog", "cat"] : [p.pet_type])));
  const landingPages = [
    ...Object.keys(categorySeo).filter((slug) => categorySlugs.has(slug)).map((slug) => `/shop?category=${slug}`),
    ...Object.keys(petSeo).filter((pet) => petTypes.has(pet)).map((pet) => `/shop?pet=${pet}`),
  ].map((path) => ({ url: `${site.url}${path}`, changeFrequency: "weekly" as const }));

  return [...staticPages, ...landingPages, ...productPages, ...guidePages];
}
