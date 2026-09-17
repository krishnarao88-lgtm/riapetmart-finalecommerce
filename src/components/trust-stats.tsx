import { MapPin, Package, Star } from "lucide-react";
import { site } from "@/lib/site";

const card =
  "flex h-full items-center gap-3 rounded-2xl border-2 border-choc bg-cream px-5 py-4 transition-transform duration-200";
const iconWrap = "grid size-11 shrink-0 place-items-center rounded-full bg-peach";

/** Real, verifiable facts only — the Google rating comes from the owner's Business Profile, and the
 * product count is a live query, so this never says something the store can't back up. */
export function TrustStats({ publishedProductCount }: { publishedProductCount: number }) {
  return (
    <section aria-label="Why shoppers trust us" className="mx-auto max-w-6xl px-4 pt-8">
      <ul className="grid gap-3 sm:grid-cols-3">
        <li>
          <a
            href={site.google.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${card} hover:-translate-y-0.5`}
          >
            <span className={iconWrap}>
              <Star className="size-5 fill-rust text-rust" aria-hidden />
            </span>
            <span className="grid">
              <span className="font-display text-lg font-extrabold text-choc">
                {site.google.rating.toFixed(1)}★ on Google
              </span>
              <span className="text-sm font-semibold text-rust underline underline-offset-2">
                {site.google.reviewCount} real reviews
              </span>
            </span>
          </a>
        </li>

        <li className={card}>
          <span className={iconWrap}>
            <Package className="size-5 text-rust" aria-hidden />
          </span>
          <span className="grid">
            <span className="font-display text-lg font-extrabold text-choc">
              {publishedProductCount > 0 ? `${publishedProductCount} products` : "New stock weekly"}
            </span>
            <span className="text-sm text-choc-2">
              {publishedProductCount > 0 ? "ready to browse now" : "check back soon"}
            </span>
          </span>
        </li>

        <li className={card}>
          <span className={iconWrap}>
            <MapPin className="size-5 text-rust" aria-hidden />
          </span>
          <span className="grid">
            <span className="font-display text-lg font-extrabold text-choc">Rawang, Selangor</span>
            <span className="text-sm text-choc-2">+ same-day Klang Valley</span>
          </span>
        </li>
      </ul>
    </section>
  );
}
