import { loadFeedItems } from "@/lib/feed-items";
import { localInventoryXml } from "@/lib/seo";
import { site } from "@/lib/site";

export const revalidate = 3600;

export async function GET() {
  if (!site.storeCode) return new Response("Store code not set", { status: 404 });
  const xml = localInventoryXml(site.storeCode, await loadFeedItems());
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
