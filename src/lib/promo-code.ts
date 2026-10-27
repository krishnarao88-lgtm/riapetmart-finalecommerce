import "server-only";
import { getStripe } from "@/lib/stripe";

export type PromoCode =
  | { ok: true; id: string; code: string; percentOff: number | null; amountOff: number | null; minimum: number | null }
  | { ok: false; error: string };

export const CODES_NOT_ON_SALE =
  "Codes can't be used on items that are already discounted (sale, clearance or bundle prices). Remove those items to use your code, or keep the sale price.";

/** Looks a customer's code up in Stripe and says whether it can still be used, and what it takes off. */
export async function resolvePromoCode(raw: string): Promise<PromoCode> {
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return { ok: false, error: "That code doesn't look right. Check it and try again." };

  const { data } = await getStripe().promotionCodes.list({ code, active: true, limit: 1, expand: ["data.promotion.coupon"] });
  const promo = data[0];
  const coupon = promo && typeof promo.promotion.coupon === "object" ? promo.promotion.coupon : null;
  const used = promo && promo.max_redemptions !== null && promo.times_redeemed >= promo.max_redemptions;
  const expired = promo?.expires_at && promo.expires_at * 1000 < Date.now();
  if (!promo || !coupon || !coupon.valid || used || expired) {
    return { ok: false, error: "We couldn't find that code, or it has already been used or expired." };
  }
  return {
    ok: true,
    id: promo.id,
    code: promo.code,
    percentOff: coupon.percent_off ?? null,
    amountOff: coupon.amount_off ? coupon.amount_off / 100 : null,
    minimum: promo.restrictions?.minimum_amount ? promo.restrictions.minimum_amount / 100 : null,
  };
}
