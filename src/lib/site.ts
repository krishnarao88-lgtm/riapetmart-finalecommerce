// Store facts confirmed by the owner (17 Sep 2026). Reused by the footer, JSON-LD and, later, the AI assistant.
export const site = {
  name: "Ria Pet Mart",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://riapetmart.com",
  tagline: "Happy pets, delivered today.",
  description:
    "Pet shop in Rawang & Bukit Beruntung. Cat food, dog food and treats with same-day delivery in Selangor & KL, free store pickup and WhatsApp orders.",
  phone: "+60 19-611 2848",
  whatsapp: "60196112848",
  email: "riapetmart@gmail.com",
  address: {
    street: "57, Jalan Jenjarum 3B, Bandar Bukit Beruntung",
    city: "Rawang",
    state: "Selangor",
    postcode: "48300",
    country: "MY",
  },
  geo: { lat: 3.4067267, lng: 101.5575358 },
  hours: { days: "Monday–Saturday", opens: "10:00", closes: "19:00", closed: "Sunday" },
  // Real figures from the owner's Google Business Profile — never invent a rating or review count.
  google: { rating: 4.1, reviewCount: 67, url: "https://share.google/nyn2T6MXEyIGxYOcw" },
  // The owner's exact pinned Google Maps listing (real Place ID) — opens the installed
  // Google Maps app on Android/iOS, falling back to the Maps website otherwise.
  // The owner's own marketplace stores, listed as the same business in structured data.
  marketplaces: {
    shopee: "https://shopee.com.my/riapetmartexpress",
    lazada: "https://www.lazada.com.my/ria-pet-mart-express/",
  },
  mapsUrl:
    "https://www.google.com/maps/place/Ria+Pet+Mart/@3.4051116,101.5577595,17.3z/data=!4m12!1m5!3m4!2zM8KwMjMnNTguNiJOIDEwMcKwMzMnMzAuMiJF!8m2!3d3.3996!4d101.5584!3m5!1s0x31cc68e83d67de1b:0xefbe9c75396960dc!8m2!3d3.4067267!4d101.5575358!16s%2Fg%2F1pzwdpqzh?entry=ttu&g_ep=EgoyMDI2MDkxNS4wIKXMDSoASAFQAw%3D%3D",
} as const;

export function whatsappLink(message = "Hi Ria Pet Mart, I have a question.") {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

// Public by design (row-level security protects the data); env vars override per environment.
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fveawvyiyqezrrkdwmpw.supabase.co";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_S7Itm9OvycSvbNROfOGPmw__aXM_tyr";
