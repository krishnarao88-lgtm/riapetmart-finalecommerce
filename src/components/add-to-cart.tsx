"use client";

import { CalendarClock, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  // Phones: a slim sticky bar appears once the main button has scrolled out of view.
  const mainButton = useRef<HTMLButtonElement>(null);
  const [barVisible, setBarVisible] = useState(false);
  useEffect(() => {
    const el = mainButton.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBarVisible(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    // Lets the floating WhatsApp/chat buttons and pop-ups sit above the bar.
    const root = document.documentElement;
    if (barVisible) root.style.setProperty("--sticky-bar", "4.75rem");
    else root.style.removeProperty("--sticky-bar");
    return () => {
      root.style.removeProperty("--sticky-bar");
    };
  }, [barVisible]);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];

  if (!variant) {
    return <p className="text-choc-2">This product isn&apos;t available for order right now.</p>;
  }
  const soldOut = variant.available === 0;
  const maxQty = variant.available ?? Infinity;

  function addNow() {
    add(
      { variantId: variant.id, productSlug, productName, variantTitle: variant.title, price: variant.price, image },
      qty,
    );
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1800);
  }

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
        ref={mainButton}
        type="button"
        disabled={soldOut}
        onClick={addNow}
        className="btn-bubble bg-terracotta px-6 py-3 text-cream disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ShoppingBag className="size-5" aria-hidden />
        {soldOut ? "Sold out" : added ? "Added!" : "Add to cart"}
      </button>

      <div
        aria-hidden={!barVisible}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-choc/10 bg-cream/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_28px_-18px_rgb(46_29_20/0.4)] backdrop-blur transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
          barVisible ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-xs text-choc-2">
              {variants.length > 1 ? variant.title : productName}
            </span>
            <span className="font-bold tabular-nums text-choc">{formatMyr(variant.price * qty)}</span>
          </div>
          <button
            type="button"
            disabled={soldOut}
            tabIndex={barVisible ? 0 : -1}
            onClick={addNow}
            className="btn-bubble bg-terracotta px-5 text-sm text-cream disabled:opacity-60"
          >
            <ShoppingBag className="size-4" aria-hidden />
            {soldOut ? "Sold out" : added ? "Added!" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
