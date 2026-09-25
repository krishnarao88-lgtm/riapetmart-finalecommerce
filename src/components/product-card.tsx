import { PawPrint, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ProductTags, SizePills } from "@/components/product-tags";
import { QuickAddButton } from "@/components/quick-add-button";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { formatMyr } from "@/lib/pricing";
import { titleCase } from "@/lib/seo";
import type { createClient } from "@/lib/supabase/server";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  size_display: string | null;
  categoryLabel?: string | null;
  pet_type?: string | null;
  highlights?: string[] | null;
  is_dvs_approved?: boolean;
  product_images: { path: string; alt: string | null }[];
  variants: { id: string; title: string; price: number }[];
};

export type VariantStock = Map<string, { available: number; nearest_expiry: string | null }>;

/** stock_batches is admin-only under RLS, so shoppers read stock through the variant_stock RPC. Null if it fails. */
export async function getVariantStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  variantIds: string[],
): Promise<VariantStock | null> {
  if (variantIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc("variant_stock", { p_variant_ids: variantIds });
  if (error) {
    console.error("variant_stock failed", error.message);
    return null;
  }
  return new Map(
    (data as { variant_id: string; available: number; nearest_expiry: string | null }[]).map((r) => [r.variant_id, r]),
  );
}

/** available is null when stock is unknown (RPC failed); a variant missing from the RPC result is inactive, so 0. */
export function productStock(
  variants: { id: string }[],
  stock: VariantStock | null,
  expirySettings: Partial<ExpirySettings>,
) {
  const rows = variants.map((v) => stock?.get(v.id));
  const available = stock ? rows.reduce((sum, r) => sum + (r?.available ?? 0), 0) : null;
  const nearest = rows.map((r) => r?.nearest_expiry).filter((d): d is string => !!d).sort()[0] ?? null;
  return { available, badge: getExpiryBadge(nearest, expirySettings) };
}

/** Shared card used by /shop and the homepage's featured products — same stock and expiry badges everywhere. */
export function ProductCard({
  product,
  stock,
  expirySettings,
}: {
  product: ProductCardData;
  stock: VariantStock | null;
  expirySettings: Partial<ExpirySettings>;
}) {
  const p = product;
  const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null;
  const { available, badge } = productStock(p.variants, stock, expirySettings);
  const soldOut = available === 0;
  const cheapestVariant =
    p.variants
      .filter((v) => !stock || (stock.get(v.id)?.available ?? 0) > 0)
      .sort((a, b) => a.price - b.price)[0] ?? null;
  const image = p.product_images[0];
  const priceNow = (price: number) => (badge?.kind === "short-dated" ? discountedPrice(price, badge.discount) : price);
  const showPrice = minPrice !== null ? priceNow(minPrice) : null;
  const name = titleCase(p.name);

  return (
    <Link
      href={`/shop/${p.slug}`}
      className="reveal group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-choc bg-surface shadow-[3px_3px_0_0_var(--color-choc)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[5px_5px_0_0_var(--color-choc)]"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-peach/40">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.path} alt={titleCase(image.alt || p.name)} className={`absolute inset-0 size-full object-contain transition-transform duration-500 ease-out motion-safe:group-hover:scale-105 ${soldOut ? "opacity-60" : ""}`} />
        ) : (
          <PawPrint className="size-10 text-rust/50" aria-hidden />
        )}
        {p.is_dvs_approved && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-bold text-ok-fg shadow-sm">
            <ShieldCheck className="size-3.5" aria-hidden /> DVS approved
          </span>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-choc px-2 py-0.5 text-xs font-bold text-cream">Sold out</span>
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
        {cheapestVariant && (
          <QuickAddButton
            variantId={cheapestVariant.id}
            productSlug={p.slug}
            productName={name}
            variantTitle={cheapestVariant.title}
            price={priceNow(cheapestVariant.price)}
            image={image?.path ?? null}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {p.categoryLabel && (
          <span className="text-xs font-semibold uppercase tracking-wide text-rust">{p.categoryLabel}</span>
        )}
        <span className="line-clamp-2 text-sm font-bold text-choc">{name}</span>
        <SizePills sizes={p.size_display} compact />
        <div className="mt-1">
          <ProductTags petType={p.pet_type} highlights={p.highlights} max={2} compact />
        </div>
        {available !== null && available > 0 && available <= 5 && (
          <span className="text-xs font-bold text-warn-fg">Only {available} left</span>
        )}
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
