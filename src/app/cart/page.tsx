"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatMyr } from "@/lib/pricing";
import { site, whatsappLink } from "@/lib/site";

export default function CartPage() {
  const { lines, subtotal, setQty, remove } = useCart();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShoppingBag className="mx-auto size-12 text-rust/50" aria-hidden />
        <h1 className="mt-4 font-bubble text-2xl font-extrabold text-choc">Your cart is empty</h1>
        <p className="mt-2 text-choc-2">Add some treats, food or supplies to get started.</p>
        <Link href="/shop" className="btn-bubble mt-6 inline-flex bg-terracotta px-6 py-3 text-cream">
          Shop all
        </Link>
      </div>
    );
  }

  const orderText = [
    `Hi ${site.name}, I'd like to order:`,
    ...lines.map((l) => `- ${l.productName} (${l.variantTitle}) x${l.qty} — ${formatMyr(l.price * l.qty)}`),
    `Subtotal: ${formatMyr(subtotal)}`,
  ].join("\n");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">Your cart</h1>

      <ul className="mt-6 grid gap-3">
        {lines.map((l) => (
          <li
            key={l.variantId}
            className="flex items-center gap-3 rounded-2xl border-2 border-choc bg-surface p-3"
          >
            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-peach/40">
              {l.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt="" className="size-full rounded-xl object-cover" />
              ) : (
                <ShoppingBag className="size-6 text-rust/50" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/shop/${l.productSlug}`} className="line-clamp-1 font-bold text-choc">
                {l.productName}
              </Link>
              <p className="text-sm text-choc-2">{l.variantTitle}</p>
              <p className="font-bold text-choc">{formatMyr(l.price)}</p>
            </div>
            <div className="flex items-center rounded-full border-2 border-choc">
              <button
                type="button"
                onClick={() => setQty(l.variantId, l.qty - 1)}
                className="grid size-9 place-items-center"
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <span className="min-w-6 text-center font-bold tabular-nums">{l.qty}</span>
              <button
                type="button"
                onClick={() => setQty(l.variantId, l.qty + 1)}
                className="grid size-9 place-items-center"
                aria-label="Increase quantity"
              >
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              onClick={() => remove(l.variantId)}
              className="grid size-9 place-items-center text-rust"
              aria-label={`Remove ${l.productName}`}
            >
              <Trash2 className="size-5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between rounded-2xl border-2 border-choc bg-cream p-4">
        <span className="font-bold text-choc">Subtotal</span>
        <span className="text-xl font-bold text-choc">{formatMyr(subtotal)}</span>
      </div>

      <a
        href={whatsappLink(orderText)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-bubble mt-4 flex w-full items-center justify-center bg-terracotta px-6 py-3 text-cream"
      >
        Order via WhatsApp
      </a>
      <p className="mt-2 text-center text-sm text-choc-2">
        We&apos;ll confirm price, delivery and payment with you on WhatsApp.
      </p>
    </div>
  );
}
