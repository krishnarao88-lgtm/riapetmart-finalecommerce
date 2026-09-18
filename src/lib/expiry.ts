export type ExpiryTier = { max_days: number; discount: number };
export type ExpirySettings = { fresh_min_days: number; short_dated: ExpiryTier[] };

export type ExpiryBadge =
  | { kind: "short-dated"; discount: number; daysLeft: number }
  | { kind: "fresh"; daysLeft: number };

const DEFAULT_SETTINGS: ExpirySettings = {
  fresh_min_days: 181,
  short_dated: [{ max_days: 90, discount: 0.15 }],
};

export function daysUntil(dateIso: string, now = new Date()): number {
  const ms = new Date(dateIso).getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

/** Badge for the earliest-expiring batch of a product/variant, or null when nothing qualifies. */
export function getExpiryBadge(
  nearestExpiryIso: string | null,
  settings: Partial<ExpirySettings> = {},
): ExpiryBadge | null {
  if (!nearestExpiryIso) return null;
  const tiers = settings.short_dated?.length ? settings.short_dated : DEFAULT_SETTINGS.short_dated;
  const freshMinDays = settings.fresh_min_days ?? DEFAULT_SETTINGS.fresh_min_days;
  const daysLeft = daysUntil(nearestExpiryIso);

  const tier = [...tiers].sort((a, b) => a.max_days - b.max_days).find((t) => daysLeft <= t.max_days);
  if (tier) return { kind: "short-dated", discount: tier.discount, daysLeft };
  if (daysLeft >= freshMinDays) return { kind: "fresh", daysLeft };
  return null;
}

export function discountedPrice(price: number, discount: number): number {
  return Math.round(price * (1 - discount) * 100) / 100;
}
