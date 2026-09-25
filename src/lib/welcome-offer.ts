import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { supabasePublishableKey, supabaseUrl } from "@/lib/site";

/** The sign-up offer, set in Admin → Settings. delay_seconds 0 = never pops up by itself (the homepage banner still opens it). */
export type WelcomeOffer = { enabled: boolean; percent: number; delay_seconds: number };

export const DEFAULT_WELCOME_OFFER: WelcomeOffer = { enabled: true, percent: 10, delay_seconds: 30 };

export function toWelcomeOffer(value: unknown): WelcomeOffer {
  const v = (value ?? {}) as Partial<WelcomeOffer>;
  const percent = Number(v.percent);
  const delay = Number(v.delay_seconds);
  return {
    enabled: v.enabled ?? DEFAULT_WELCOME_OFFER.enabled,
    percent: percent >= 1 && percent <= 50 ? Math.round(percent) : DEFAULT_WELCOME_OFFER.percent,
    delay_seconds: delay >= 0 ? Math.round(delay) : DEFAULT_WELCOME_OFFER.delay_seconds,
  };
}

/** Uncached read, for the signup API so a switched-off offer can't still issue codes. */
export async function readWelcomeOffer(): Promise<WelcomeOffer> {
  const { data } = await createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } })
    .from("settings")
    .select("value")
    .eq("key", "welcome_offer")
    .maybeSingle();
  return toWelcomeOffer(data?.value);
}

// Saving Admin → Settings clears this tag.
export const getWelcomeOffer = unstable_cache(readWelcomeOffer, ["welcome-offer"], {
  revalidate: 300,
  tags: ["welcome-offer"],
});
