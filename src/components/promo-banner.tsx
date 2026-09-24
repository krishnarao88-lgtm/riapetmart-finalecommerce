import { RefreshCw, Truck } from "lucide-react";
import Link from "next/link";

/** Real, live offers only — WELCOME10 and the RM150 free-delivery threshold both actually work at checkout. */
export function PromoBanner() {
  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-4 pt-8 sm:grid-cols-[1.3fr_1fr]">
      <Link
        href="/shop"
        className="grid content-center gap-2 rounded-3xl border-2 border-choc bg-terracotta p-6 text-cream transition-transform hover:-translate-y-0.5"
      >
        <span className="font-bubble text-2xl font-extrabold">New here? Get 10% off</span>
        <span className="text-sm text-cream/90">
          Use code <strong>WELCOME10</strong> at checkout on your first order.
        </span>
      </Link>

      <div className="grid gap-3">
        <div className="flex items-center gap-3 rounded-2xl border-2 border-choc bg-cream px-4 py-3">
          <Truck className="size-6 shrink-0 text-rust" aria-hidden />
          <span className="grid">
            <span className="text-sm font-bold text-choc">Free delivery</span>
            <span className="text-xs text-choc-2">On orders above RM150</span>
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-choc bg-cream px-4 py-3">
          <RefreshCw className="size-6 shrink-0 text-rust" aria-hidden />
          <span className="grid">
            <span className="text-sm font-bold text-choc">Never run out</span>
            <span className="text-xs text-choc-2">We&apos;ll email a restock reminder</span>
          </span>
        </div>
      </div>
    </section>
  );
}
