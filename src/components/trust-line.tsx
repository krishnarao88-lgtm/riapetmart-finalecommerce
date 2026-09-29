import { CalendarCheck, ShieldCheck, Store } from "lucide-react";

// Owner-confirmed facts only (29 Sep 2026): stock comes from local Malaysian suppliers, and product pages show
// the best-before date from stock batches. Don't upgrade this to "authorised" or a minimum-expiry promise
// without written proof / a checked guarantee.
export const TRUST_POINTS = [
  { Icon: ShieldCheck, title: "Genuine stock", body: "Bought from local Malaysian suppliers, sold from our own shop." },
  { Icon: CalendarCheck, title: "Best-before shown", body: "See the date before you buy. Short-dated stock is labelled and discounted." },
  { Icon: Store, title: "Real shop in Rawang", body: "Visit us in Bukit Beruntung, Mon–Sat 10:00–19:00." },
] as const;

/** Compact row for product pages and the cart. */
export function TrustLine() {
  return (
    <ul className="grid gap-2 text-sm sm:grid-cols-3">
      {TRUST_POINTS.map(({ Icon, title }) => (
        <li key={title} className="flex items-center gap-2 font-semibold text-choc">
          <Icon className="size-4 shrink-0 text-rust" aria-hidden /> {title}
        </li>
      ))}
    </ul>
  );
}
