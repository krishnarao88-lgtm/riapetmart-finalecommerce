// Free gift with every purchase (owner, 4 Nov 2026, until 12 Nov or while stock lasts): an Aristocat can for
// orders with cat items (mixed carts too), a Sniffly dog pouch for dog-only orders. Configured in
// settings.free_gift so it can be switched off or changed without a deploy.
import type { SupabaseClient } from "@supabase/supabase-js";

export type GiftKind = "cat" | "dog";
type Group = { label: string; variant_ids: string[] };
export type FreeGiftSetting = { enabled: boolean; ends_on: string; cat?: Group; dog?: Group };
export type GiftStock = { variant_id: string; available: number; nearest_expiry: string | null };
export type FreeGift = { kind: GiftKind; variantId: string; label: string; bestBefore: string | null; endsOn: string };

/** Today in Malaysia as YYYY-MM-DD. */
export const todayMY = (now = new Date()) => new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);

/** Dog gift only when the cart has dog items and no cat items; everything else (cat, mixed, either) gets the cat can. */
export function giftKindFor(petTypes: string[]): GiftKind {
  return petTypes.includes("dog") && !petTypes.includes("cat") ? "dog" : "cat";
}

/** The gift to hand out now: the in-stock item that expires soonest, or null once the offer is off, over or sold out. */
export function pickGift(setting: Partial<FreeGiftSetting> | null, stock: GiftStock[], today: string, kind: GiftKind): FreeGift | null {
  const group = setting?.[kind];
  if (!setting?.enabled || !setting.ends_on || today > setting.ends_on || !group?.variant_ids?.length) return null;
  const best = stock
    .filter((s) => group.variant_ids.includes(s.variant_id) && s.available > 0)
    .sort((a, b) => (a.nearest_expiry ?? "9999").localeCompare(b.nearest_expiry ?? "9999"))[0];
  return best ? { kind, variantId: best.variant_id, label: group.label, bestBefore: best.nearest_expiry, endsOn: setting.ends_on } : null;
}

/** Both gifts as they stand right now (either can be null). */
export async function getFreeGifts(supabase: SupabaseClient): Promise<Record<GiftKind, FreeGift | null>> {
  const { data: row } = await supabase.from("settings").select("value").eq("key", "free_gift").maybeSingle();
  const setting = (row?.value ?? null) as Partial<FreeGiftSetting> | null;
  const ids = [...(setting?.cat?.variant_ids ?? []), ...(setting?.dog?.variant_ids ?? [])];
  if (!setting?.enabled || !ids.length) return { cat: null, dog: null };
  const { data: stock } = await supabase.rpc("variant_stock", { p_variant_ids: ids });
  const rows = (stock ?? []) as GiftStock[];
  const today = todayMY();
  return { cat: pickGift(setting, rows, today, "cat"), dog: pickGift(setting, rows, today, "dog") };
}

/** "8 Nov" for banners and the cart. */
export function shortDate(iso: string | null) {
  if (!iso) return "";
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
}
