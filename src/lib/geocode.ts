import "server-only";

export type LatLng = { lat: string; lng: string };

/**
 * Free geocoding via OpenStreetMap Nominatim, no API key.
 * Many Malaysian street addresses (e.g. most of Bukit Beruntung 48300) aren't in OpenStreetMap, so when the full
 * address isn't found we fall back to its postcode, then to "town, state". The rider still gets the full address
 * text; the pin only has to be close enough to price and route the trip.
 * ponytail: single free provider; add a paid geocoder (Google/HERE) if postcode-level pins prove too rough.
 */
export async function geocodeAddress(addressLine: string): Promise<LatLng | null> {
  const parts = addressLine.split(",").map((p) => p.trim()).filter(Boolean);
  const postcode = addressLine.match(/\b\d{5}\b/)?.[0];
  const queries = [
    addressLine,
    postcode && `${postcode}, Malaysia`,
    parts.length > 2 && parts.slice(-3).join(", ").replace(/\b\d{5}\s*/, ""),
  ].filter((q): q is string => Boolean(q));

  for (const q of queries) {
    const hit = await search(q);
    if (hit) return hit;
  }
  console.error("Geocode: address not found:", addressLine);
  return null;
}

async function search(q: string): Promise<LatLng | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", "my");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": "RiaPetMart-Checkout/1.0 (contact: hello@riapetmart.com)" },
  }).catch(() => null);
  if (!res?.ok) return null;

  const results = (await res.json()) as { lat: string; lon: string }[];
  const first = results[0];
  return first ? { lat: first.lat, lng: first.lon } : null;
}
