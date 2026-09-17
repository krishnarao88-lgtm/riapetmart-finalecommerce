import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// ponytail: static pages only; Stage 3 adds product and category URLs from the database.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/shop", "/about", "/contact"].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: path === "/shop" ? "daily" : "monthly",
  }));
}
