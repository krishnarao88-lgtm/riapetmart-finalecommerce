import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";

export type CartLineInput = { variantId: string; qty: number };
export type PricedItem = { variant_id: string; name: string; title: string; qty: number; price: number; image: string | null };
export type PricedCart = { items: PricedItem[]; subtotal: number; weightGrams: number };

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
    supabase.from("variants").select("id, title, price, weight_grams, products(name, product_images(path))").in("id", ids),
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

  const items: PricedItem[] = [];
  let subtotal = 0;
  let weightGrams = 0;
  for (const line of lines) {
    const v = variants.find((row) => row.id === line.variantId)!;
    const product = v.products as unknown as { name: string; product_images: { path: string }[] } | null;
    const name = product?.name ?? v.title;
    const s = stock.get(v.id);
    if (!s || s.available < line.qty) {
      const left = s?.available ?? 0;
      return {
        error: left > 0 ? `Only ${left} left of ${name} (${v.title})` : `${name} (${v.title}) is out of stock`,
      };
    }
    const badge = getExpiryBadge(s.nearest_expiry, expirySettings);
    const price = badge?.kind === "short-dated" ? discountedPrice(v.price, badge.discount) : Number(v.price);
    subtotal += price * line.qty;
    weightGrams += (v.weight_grams ?? 500) * line.qty;
    items.push({
      variant_id: v.id,
      name,
      title: v.title,
      qty: line.qty,
      price,
      image: product?.product_images?.[0]?.path ?? null,
    });
  }
  return { items, subtotal: Math.round(subtotal * 100) / 100, weightGrams };
}
