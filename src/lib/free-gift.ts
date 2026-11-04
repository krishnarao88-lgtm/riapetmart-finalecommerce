// Free gift with every order (owner, 4 Nov 2026: one Aristocat can, best before 8–13 Nov, until 12 Nov or
// while stock lasts). Configured in settings.free_gift so it can be switched off without a deploy.
import type { SupabaseClient } from "@supabase/supabase-js";

export type FreeGiftSetting = { enabled: boolean; ends_on: string; label: string; variant_ids: string[] };
export type GiftStock = { variant_id: string; available: number; nearest_expiry: string | null };
export type FreeGift = { variantId: string; label: string; bestBefore: string | null; endsOn: string };

/** Today in Malaysia as YYYY-MM-DD. */
export const todayMY = (now = new Date()) => new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);

/** The gift to hand out now: the in-stock can that expires soonest, or null once the offer is off, over or sold out. */
export function pickGift(setting: Partial<FreeGiftSetting> | null, stock: GiftStock[], today: string): FreeGift | null {
  if (!setting?.enabled || !setting.ends_on || today > setting.ends_on || !setting.variant_ids?.length) return null;
  const best = stock
    .filter((s) => setting.variant_ids!.includes(s.variant_id) && s.available > 0)
    .sort((a, b) => (a.nearest_expiry ?? "9999").localeCompare(b.nearest_expiry ?? "9999"))[0];
  return best
    ? { variantId: best.variant_id, label: setting.label ?? "Free gift", bestBefore: best.nearest_expiry, endsOn: setting.ends_on }
    : null;
}

export async function getFreeGift(supabase: SupabaseClient): Promise<FreeGift | null> {
  const { data: row } = await supabase.from("settings").select("value").eq("key", "free_gift").maybeSingle();
  const setting = (row?.value ?? null) as Partial<FreeGiftSetting> | null;
  if (!setting?.enabled || !setting.variant_ids?.length) return null;
  const { data: stock } = await supabase.rpc("variant_stock", { p_variant_ids: setting.variant_ids });
  return pickGift(setting, (stock ?? []) as GiftStock[], todayMY());
}

/** "8 Nov" for banners and the cart. */
export function shortDate(iso: string | null) {
  if (!iso) return "";
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
}
