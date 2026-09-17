// Store facts confirmed by the owner (17 Sep 2026). Reused by the footer, JSON-LD and, later, the AI assistant.
export const site = {
  name: "Ria Pet Mart",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://riapetmart.com",
  tagline: "Happy pets, delivered today.",
  description:
    "Pet food, treats and care essentials from our Rawang shop. Same-day delivery in the Klang Valley, nationwide courier and free store pickup.",
  phone: "+60 19-611 2848",
  whatsapp: "60196112848",
  address: {
    street: "57, Jalan Jenjarum 3B, Bandar Bukit Beruntung",
    city: "Rawang",
    state: "Selangor",
    postcode: "48300",
    country: "MY",
  },
  geo: { lat: 3.3996, lng: 101.5584 },
  hours: { days: "Monday–Saturday", opens: "10:00", closes: "19:00", closed: "Sunday" },
  // Real figures from the owner's Google Business Profile — never invent a rating or review count.
  google: { rating: 4.1, reviewCount: 67, url: "https://share.google/nyn2T6MXEyIGxYOcw" },
} as const;

export function whatsappLink(message = "Hi Ria Pet Mart, I have a question.") {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

// Public by design (row-level security protects the data); env vars override per environment.
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fveawvyiyqezrrkdwmpw.supabase.co";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_S7Itm9OvycSvbNROfOGPmw__aXM_tyr";
