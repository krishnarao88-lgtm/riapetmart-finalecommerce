import "server-only";

export type LatLng = { lat: string; lng: string };

/**
 * Free geocoding via OpenStreetMap Nominatim — no API key.
 * ponytail: single provider, no fallback if Nominatim is down or the
 * address doesn't resolve; add a paid geocoder (Google/HERE) if that
 * becomes a real problem in practice.
 */
export async function geocodeAddress(addressLine: string): Promise<LatLng | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", addressLine);
  url.searchParams.set("countrycodes", "my");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": "RiaPetMart-Checkout/1.0 (contact: hello@riapetmart.com)" },
  });
  if (!res.ok) return null;

  const results = (await res.json()) as { lat: string; lon: string }[];
  const first = results[0];
  return first ? { lat: first.lat, lng: first.lon } : null;
}
