"use client";

import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CartSuggestion } from "@/app/api/cart-price/route";
import { type CartLine, useCart } from "@/lib/cart-context";
import { formatMyr } from "@/lib/pricing";

type PricedLine = { price: number; list_price: number; discount: string | null; discount_label: string | null };
export type PricedCartView = { items: Map<string, PricedLine>; subtotal: number; suggestions: CartSuggestion[] };

/** Asks the server what checkout will actually charge (bundle and short-dated discounts included). */
export function usePricedCart(lines: CartLine[]): PricedCartView | null {
  const key = lines.map((l) => `${l.variantId}:${l.qty}`).join(",");
  const [result, setResult] = useState<{ key: string; view: PricedCartView } | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })) }),
          signal: controller.signal,
        });
        if (!res.ok) return; // stock or availability problems are reported at checkout
        const data = await res.json();
        setResult({
          key,
          view: {
            items: new Map((data.items as ({ variant_id: string } & PricedLine)[]).map((i) => [i.variant_id, i])),
            subtotal: data.subtotal,
            suggestions: data.suggestions,
          },
        });
      } catch {
        // offline or aborted: keep showing the cart's own prices
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // lines is captured through key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return result?.key === key ? result.view : null;
}

export function LinePrice({ fallback, priced }: { fallback: number; priced: PricedLine | undefined }) {
  if (!priced || !priced.discount) return <p className="font-bold text-choc">{formatMyr(priced?.price ?? fallback)}</p>;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 font-bold text-choc">
      <span className="text-sm font-normal text-choc-2 line-through">{formatMyr(priced.list_price)}</span>
      {formatMyr(priced.price)}
      <span className="rounded-full bg-ok-bg px-2 py-0.5 text-xs text-ok-fg">
        {priced.discount_label}
      </span>
    </p>
  );
}

export function CartSuggestions({ suggestions }: { suggestions: CartSuggestion[] }) {
  const { add } = useCart();
  if (suggestions.length === 0) return null;

  return (
    <section aria-labelledby="suggest-heading" className="mt-6 rounded-2xl card-soft bg-peach/30 p-4">
      <h2 id="suggest-heading" className="flex items-center gap-2 font-bold text-choc">
        <Sparkles className="size-4 text-rust" aria-hidden /> Complete the care
      </h2>
      <ul className="mt-3 grid gap-2">
        {suggestions.map((s) => (
          <li key={s.variantId} className="flex items-center gap-3 rounded-xl bg-surface p-2">
            <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-peach/40">
              {s.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image} alt="" className="size-full object-contain" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/shop/${s.productSlug}`} className="line-clamp-1 text-sm font-bold text-choc">
                {s.productName}
              </Link>
              <p className="text-sm text-choc-2">
                {s.variantTitle} ·{" "}
                {s.price < s.listPrice ? (
                  <>
                    <span className="line-through">{formatMyr(s.listPrice)}</span>{" "}
                    <strong className="text-ok-fg">{formatMyr(s.price)} with your order</strong>
                  </>
                ) : (
                  formatMyr(s.price)
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                add({
                  variantId: s.variantId,
                  productSlug: s.productSlug,
                  productName: s.productName,
                  variantTitle: s.variantTitle,
                  price: s.price,
                  image: s.image,
                })
              }
              aria-label={`Add ${s.productName} to cart`}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-terracotta text-cream transition-transform active:scale-90"
            >
              <Plus className="size-5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
