import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Shop filter combinations (two or more filters, deals, stock toggle) are noindex and often empty; Google was
      // spending its crawl on ~100 of them (Search Console, Oct 2026) instead of product pages. Single filters like
      // /shop?pet=cat stay crawlable.
      disallow: ["/admin", "/auth", "/cart", "/account", "/shop?*&", "/shop?*deal=", "/shop?*stock="],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
