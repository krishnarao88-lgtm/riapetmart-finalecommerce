"use client";

import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { FreeShippingProgress } from "@/components/free-shipping-progress";
import { useCart } from "@/lib/cart-context";
import { formatMyr } from "@/lib/pricing";

export function CartDrawer({ freeDeliveryMin }: { freeDeliveryMin: number | null }) {
  const { lines, subtotal, isOpen, closeCart, setQty } = useCart();

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={closeCart}
        aria-label="Close cart"
        className="absolute inset-0 bg-choc/40"
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-cream shadow-xl transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b-2 border-choc/15 p-4">
          <h2 className="font-bubble text-xl font-extrabold text-choc">Your cart</h2>
          <button type="button" onClick={closeCart} aria-label="Close cart" className="grid size-9 place-items-center rounded-full hover:bg-peach/40">
            <X className="size-5 text-choc" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <p className="mt-10 text-center text-choc-2">Your cart is empty.</p>
          ) : (
            <ul className="grid gap-3">
              {lines.map((l) => (
                <li key={l.variantId} className="flex items-center gap-3 rounded-2xl border-2 border-choc/20 p-2">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-peach/40">
                    {l.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.image} alt="" className="size-full rounded-xl object-cover" />
                    ) : (
                      <ShoppingBag className="size-5 text-rust/50" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-choc">{l.productName}</p>
                    <p className="text-xs text-choc-2">{l.variantTitle}</p>
                    <p className="text-sm font-bold text-choc">{formatMyr(l.price)}</p>
                  </div>
                  <div className="flex items-center rounded-full border-2 border-choc/40">
                    <button
                      type="button"
                      onClick={() => setQty(l.variantId, l.qty - 1)}
                      className="grid size-7 place-items-center"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-3" aria-hidden />
                    </button>
                    <span className="min-w-5 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(l.variantId, l.qty + 1)}
                      className="grid size-7 place-items-center"
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-3" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t-2 border-choc/15 p-4">
            <FreeShippingProgress subtotal={subtotal} threshold={freeDeliveryMin} />
            <div className="mt-3 flex items-center justify-between font-bold text-choc">
              <span>Subtotal</span>
              <span className="text-xl">{formatMyr(subtotal)}</span>
            </div>
            <Link
              href="/cart"
              onClick={closeCart}
              className="btn-bubble mt-3 flex w-full items-center justify-center bg-terracotta px-6 py-3 text-cream"
            >
              Go to checkout
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
