import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { supabasePublishableKey, supabaseUrl } from "@/lib/site";

export type DeliverySettings = {
  pickup_enabled?: boolean;
  same_day_states?: string[];
  lalamove_enabled?: boolean;
  easyparcel_enabled?: boolean;
  free_delivery_min?: number | null;
};

/** null means free delivery is switched off. */
export function freeDeliveryMin(d: DeliverySettings): number | null {
  const v = d.free_delivery_min;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

// Cookie-free and cached so the root layout doesn't force every page to render dynamically.
// Display only: checkout and quotes re-read the setting fresh.
export const getDeliverySettings = unstable_cache(
  async (): Promise<DeliverySettings> => {
    const { data } = await createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } })
      .from("settings")
      .select("value")
      .eq("key", "delivery")
      .maybeSingle();
    return (data?.value ?? {}) as DeliverySettings;
  },
  ["delivery-settings"],
  // Saving Admin → Settings clears this tag, so changes show on the next page load.
  { revalidate: 300, tags: ["delivery-settings"] },
);
