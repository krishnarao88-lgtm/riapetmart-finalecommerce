import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bundleEligible, type CareProduct } from "@/lib/care-needs";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { todayInKL } from "@/lib/kl-time";
import { type Promotion, promoFor, promoLabel } from "@/lib/promotions";

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
  discount: "short-dated" | "bundle" | "sale" | null;
  /** Shown next to the price, e.g. "Deepavali Sale -10%". */
  discount_label: string | null;
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
  const today = todayInKL();
  const [{ data: variants }, { data: stockRows }, { data: settingsRow }, { data: promoRows }] = await Promise.all([
    supabase
      .from("variants")
      .select("id, title, price, weight_grams, products(id, name, highlights, pet_type, brand_id, category_id, brands(is_house_brand), product_images(path))")
      .in("id", ids),
    supabase.rpc("variant_stock", { p_variant_ids: ids }),
    supabase.from("settings").select("value").eq("key", "expiry_badges").maybeSingle(),
    supabase
      .from("promotions")
      .select("id, name, starts_on, ends_on, discount, scope, brand_id, category_id, banner, excluded_product_ids")
      .eq("is_active", true)
      .lte("starts_on", today)
      .gte("ends_on", today),
  ]);
  const promos = ((promoRows ?? []) as Promotion[]).map((p) => ({ ...p, discount: Number(p.discount) }));
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
    brand_id: string | null;
    category_id: string | null;
    brands: { is_house_brand: boolean } | null;
    product_images: { path: string }[];
  };
  const productOf = (v: (typeof variants)[number]) => v.products as unknown as Product | null;
  const careProducts: CareProduct[] = variants
    .map(productOf)
    .filter((p): p is Product => p !== null)
    .map((p) => ({ id: p.id, name: p.name, highlights: p.highlights, pet_type: p.pet_type, house: p.brands?.is_house_brand === true }));
  const bundled = bundleEligible(careProducts);
  // Only offers the owner approved (Admin → Offers), at the approved %.
  const { data: offerRows } = bundled.size
    ? await supabase.from("bundle_offers").select("product_id, discount").eq("approved", true).in("product_id", [...bundled])
    : { data: [] };
  const bundleOff = new Map((offerRows ?? []).map((o) => [o.product_id as string, Number(o.discount)]));

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
    // Best single discount wins: short-dated, own-brand bundle or holiday sale. They never stack.
    type Offer = { price: number; kind: PricedItem["discount"]; label: string | null };
    const offers: Offer[] = [{ price: listPrice, kind: null, label: null }];
    if (badge?.kind === "short-dated") {
      const pct = Math.round(badge.discount * 100);
      offers.push({ price: discountedPrice(listPrice, badge.discount), kind: "short-dated", label: `Short-dated -${pct}%` });
    }
    const bundleRate = product ? bundleOff.get(product.id) : undefined;
    if (bundleRate) {
      offers.push({ price: discountedPrice(listPrice, bundleRate), kind: "bundle", label: `Bundle -${Math.round(bundleRate * 100)}%` });
    }
    const sale = product
      ? promoFor(
          {
            id: product.id,
            brand_id: product.brand_id,
            category_id: product.category_id,
            house: product.brands?.is_house_brand === true,
          },
          promos,
          today,
        )
      : null;
    if (sale) offers.push({ price: discountedPrice(listPrice, sale.discount), kind: "sale", label: promoLabel(sale) });
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
      discount_label: best.label,
    });
  }
  return { items, subtotal: Math.round(subtotal * 100) / 100, weightGrams, care: careProducts };
}
