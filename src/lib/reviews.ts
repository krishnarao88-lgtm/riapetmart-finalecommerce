import { supabaseUrl } from "@/lib/site";

export const reviewImageUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/review-images/${path}`;

/** Badge text for where a verified review came from (marketplace imports have no order in our system). */
export function verifiedLabel(source: string, orderId: string | null): string | null {
  if (source === "tiktok") return "Verified TikTok Shop purchase";
  if (source === "shopee") return "Verified Shopee purchase";
  return orderId ? "Verified purchase" : null;
}
