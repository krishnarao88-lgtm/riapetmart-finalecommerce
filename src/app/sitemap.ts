import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: products } = await supabase.from("products").select("slug").eq("status", "published");

  const staticPages = ["", "/shop", "/about", "/contact", "/returns", "/privacy"].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: (path === "/shop" ? "daily" : "monthly") as "daily" | "monthly",
  }));
  const productPages = (products ?? []).map((p) => ({
    url: `${site.url}/shop/${p.slug}`,
    changeFrequency: "weekly" as const,
  }));

  return [...staticPages, ...productPages];
}
