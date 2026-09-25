"use client";

import { CalendarClock, Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { formatMyr } from "@/lib/pricing";
import { useCart } from "@/lib/cart-context";

// available is null when stock is unknown.
type Variant = {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  available?: number | null;
  /** Soonest best-before date of the stock we'd ship (YYYY-MM-DD), and whether it's short-dated. */
  bestBefore?: string | null;
  shortDated?: boolean;
};

export function AddToCart({
  productSlug,
  productName,
  image,
  variants,
}: {
  productSlug: string;
  productName: string;
  image: string | null;
  variants: Variant[];
}) {
  const { add, openCart } = useCart();
  const [variantId, setVariantId] = useState((variants.find((v) => v.available !== 0) ?? variants[0])?.id ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];

  if (!variant) {
    return <p className="text-choc-2">This product isn&apos;t available for order right now.</p>;
  }
  const soldOut = variant.available === 0;
  const maxQty = variant.available ?? Infinity;

  return (
    <div className="grid gap-4">
      {variants.length > 1 && (
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-choc">Size / pack</span>
          <select
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setQty(1);
            }}
            className="rounded-xl border border-choc/30 bg-surface px-3 py-2 font-semibold text-choc"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title} — {formatMyr(v.price)}
                {v.originalPrice && v.originalPrice > v.price ? ` (was ${formatMyr(v.originalPrice)})` : ""}
                {v.available === 0 ? " — sold out" : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border-2 border-choc">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid size-10 place-items-center"
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="min-w-8 text-center font-bold tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="grid size-10 place-items-center"
            aria-label="Increase quantity"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <span className="flex items-baseline gap-2">
          {variant.originalPrice && variant.originalPrice > variant.price && (
            <span className="text-sm text-choc-2 line-through">{formatMyr(variant.originalPrice * qty)}</span>
          )}
          <span className="text-xl font-bold text-choc">{formatMyr(variant.price * qty)}</span>
        </span>
      </div>

      {variant.bestBefore && !soldOut && (
        <span className={`flex items-center gap-1.5 text-sm font-semibold ${variant.shortDated ? "text-rust" : "text-choc-2"}`}>
          <CalendarClock className="size-4" aria-hidden />
          Best before{" "}
          {new Date(variant.bestBefore).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
          {variant.shortDated ? " · short-dated, priced down" : ""}
        </span>
      )}
      {variant.available != null && variant.available > 0 && variant.available <= 5 && (
        <span className="w-fit rounded-full bg-warn-bg px-3 py-1 text-xs font-bold text-warn-fg">
          Only {variant.available} left in stock
        </span>
      )}

      <button
        type="button"
        disabled={soldOut}
        onClick={() => {
          add(
            {
              variantId: variant.id,
              productSlug,
              productName,
              variantTitle: variant.title,
              price: variant.price,
              image,
            },
            qty,
          );
          setAdded(true);
          openCart();
          setTimeout(() => setAdded(false), 1800);
        }}
        className="btn-bubble bg-terracotta px-6 py-3 text-cream disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ShoppingBag className="size-5" aria-hidden />
        {soldOut ? "Sold out" : added ? "Added!" : "Add to cart"}
      </button>
    </div>
  );
}
