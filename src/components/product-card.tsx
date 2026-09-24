import { PawPrint } from "lucide-react";
import Link from "next/link";
import { QuickAddButton } from "@/components/quick-add-button";
import { discountedPrice, getExpiryBadge } from "@/lib/expiry";
import { formatMyr } from "@/lib/pricing";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  size_display: string | null;
  categoryLabel?: string | null;
  product_images: { path: string; alt: string | null }[];
  variants: { id: string; title: string; price: number; stock_batches: { expiry_date: string | null }[] }[];
};

/** Shared card used by /shop and the homepage's featured products — same expiry/clearance badges everywhere. */
export function ProductCard({ product, expirySettings }: { product: ProductCardData; expirySettings: Parameters<typeof getExpiryBadge>[1] }) {
  const p = product;
  const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null;
  const cheapestVariant = [...p.variants].sort((a, b) => a.price - b.price)[0] ?? null;
  const image = p.product_images[0];
  const expiries = p.variants.flatMap((v) => v.stock_batches.map((b) => b.expiry_date)).filter(Boolean) as string[];
  const nearest = expiries.sort()[0] ?? null;
  const badge = getExpiryBadge(nearest, expirySettings);
  const showPrice = minPrice !== null && badge?.kind === "short-dated" ? discountedPrice(minPrice, badge.discount) : minPrice;

  return (
    <Link
      href={`/shop/${p.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-choc bg-surface shadow-[3px_3px_0_0_var(--color-choc)] transition-transform hover:-translate-y-0.5"
    >
      <div className="relative flex aspect-square items-center justify-center bg-peach/40">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.path} alt={image.alt ?? p.name} className="size-full object-cover" />
        ) : (
          <PawPrint className="size-10 text-rust/50" aria-hidden />
        )}
        {badge?.kind === "short-dated" && (
          <span className="absolute left-2 top-2 rounded-full bg-rust px-2 py-0.5 text-xs font-bold text-cream">
            -{Math.round(badge.discount * 100)}% short-dated
          </span>
        )}
        {badge?.kind === "fresh" && (
          <span className="absolute left-2 top-2 rounded-full bg-ok-bg px-2 py-0.5 text-xs font-bold text-ok-fg">
            Fresh stock
          </span>
        )}
        {cheapestVariant && showPrice !== null && (
          <QuickAddButton
            variantId={cheapestVariant.id}
            productSlug={p.slug}
            productName={p.name}
            variantTitle={cheapestVariant.title}
            price={showPrice}
            image={image?.path ?? null}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {p.categoryLabel && (
          <span className="text-xs font-semibold uppercase tracking-wide text-rust">{p.categoryLabel}</span>
        )}
        <span className="line-clamp-2 text-sm font-bold text-choc">{p.name}</span>
        {p.size_display && <span className="text-xs text-choc-2">{p.size_display}</span>}
        <span className="mt-auto flex items-baseline gap-2 pt-1">
          {badge?.kind === "short-dated" && minPrice !== null && (
            <span className="text-xs text-choc-2 line-through">{formatMyr(minPrice)}</span>
          )}
          <span className="font-bold text-choc">
            {showPrice !== null ? `from ${formatMyr(showPrice)}` : "Price on request"}
          </span>
        </span>
      </div>
    </Link>
  );
}
