import type { MetadataRoute } from "next";
import { guides } from "@/lib/guides";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: products } = await supabase.from("products").select("slug").eq("status", "published");

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

  return [...staticPages, ...productPages, ...guidePages];
}
