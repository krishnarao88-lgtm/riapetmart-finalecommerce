import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUNDLE_DISCOUNT, bundleEligible, type CareProduct } from "@/lib/care-needs";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";

export type CartLineInput = { variantId: string; qty: number };
export type PricedItem = {
  variant_id: string;
  name: string;
  title: string;
  qty: number;
  price: number;
  image: string | null;
  /** Price before any discount, and which discount applied (the single best one; they never stack). */
  list_price: number;
  discount: "short-dated" | "bundle" | null;
};
/** `care` describes the cart's products so callers can suggest pairings. */
export type PricedCart = { items: PricedItem[]; subtotal: number; weightGrams: number; care: CareProduct[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseLines(raw: unknown): CartLineInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) return null;
  const lines = raw.map((l) => ({ variantId: String(l?.variantId ?? ""), qty: Number(l?.qty) }));
  const valid = lines.every((l) => UUID.test(l.variantId) && Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= 99);
  const unique = new Set(lines.map((l) => l.variantId)).size === lines.length;
  return valid && unique ? lines : null;
}

/** Server-side prices (short-dated discount applied) and stock check — never trust the browser's cart prices. */
export async function priceCart(
  supabase: SupabaseClient,
  lines: CartLineInput[],
): Promise<PricedCart | { error: string }> {
  const ids = lines.map((l) => l.variantId);
  const [{ data: variants }, { data: stockRows }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("variants")
      .select("id, title, price, weight_grams, products(id, name, highlights, pet_type, brands(is_house_brand), product_images(path))")
      .in("id", ids),
    supabase.rpc("variant_stock", { p_variant_ids: ids }),
    supabase.from("settings").select("value").eq("key", "expiry_badges").maybeSingle(),
  ]);
  if (!variants || variants.length !== ids.length) return { error: "One or more items are no longer available" };

  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
  const stock = new Map(
    ((stockRows ?? []) as { variant_id: string; available: number; nearest_expiry: string | null }[]).map((s) => [
      s.variant_id,
      s,
    ]),
  );

  type Product = {
    id: string;
    name: string;
    highlights: string[] | null;
    pet_type: string;
    brands: { is_house_brand: boolean } | null;
    product_images: { path: string }[];
  };
  const productOf = (v: (typeof variants)[number]) => v.products as unknown as Product | null;
  const careProducts: CareProduct[] = variants
    .map(productOf)
    .filter((p): p is Product => p !== null)
    .map((p) => ({ id: p.id, name: p.name, highlights: p.highlights, pet_type: p.pet_type, house: p.brands?.is_house_brand === true }));
  const bundled = bundleEligible(careProducts);

  const items: PricedItem[] = [];
  let subtotal = 0;
  let weightGrams = 0;
  for (const line of lines) {
    const v = variants.find((row) => row.id === line.variantId)!;
    const product = productOf(v);
    const name = product?.name ?? v.title;
    const s = stock.get(v.id);
    // Unpriced sizes are hidden by RLS; this guards any caller using a privileged client.
    if (Number(v.price) <= 0) return { error: `${name} (${v.title}) is not available yet` };
    if (!s || s.available < line.qty) {
      const left = s?.available ?? 0;
      return {
        error: left > 0 ? `Only ${left} left of ${name} (${v.title})` : `${name} (${v.title}) is out of stock`,
      };
    }
    const badge = getExpiryBadge(s.nearest_expiry, expirySettings);
    const listPrice = Number(v.price);
    // Best single discount wins: short-dated vs own-brand bundle.
    const offers: { price: number; kind: PricedItem["discount"] }[] = [{ price: listPrice, kind: null }];
    if (badge?.kind === "short-dated") offers.push({ price: discountedPrice(listPrice, badge.discount), kind: "short-dated" });
    if (product && bundled.has(product.id)) offers.push({ price: discountedPrice(listPrice, BUNDLE_DISCOUNT), kind: "bundle" });
    const best = offers.reduce((a, b) => (b.price < a.price ? b : a));
    const price = best.price;
    subtotal += price * line.qty;
    weightGrams += (v.weight_grams ?? 500) * line.qty;
    items.push({
      variant_id: v.id,
      name,
      title: v.title,
      qty: line.qty,
      price,
      image: product?.product_images?.[0]?.path ?? null,
      list_price: listPrice,
      discount: best.kind,
    });
  }
  return { items, subtotal: Math.round(subtotal * 100) / 100, weightGrams, care: careProducts };
}
