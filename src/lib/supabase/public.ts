import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/site";

/**
 * Cookie-free client for public storefront data (products, stock, promos, reviews). Pages that only use this
 * can be served from Vercel's cache instead of being rebuilt for every visitor.
 */
export function createPublicClient() {
  return createSupabaseClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } });
}
