import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { site, whatsappLink } from "@/lib/site";

export function SiteFooter() {
  const a = site.address;
  return (
    <footer className="mt-16 bg-rust text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-3">
          <p className="font-bubble text-2xl font-extrabold">
            ria<span className="text-peach">petmart</span>
          </p>
          <p className="text-sm text-cream/75">{site.tagline}</p>
        </div>

        <address className="grid content-start gap-1 text-sm not-italic text-cream/85">
          <span className="mb-1 text-xs font-bold uppercase tracking-widest text-cream/60">Visit the shop</span>
          <a
            href={site.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="grid gap-1 underline decoration-cream/40 underline-offset-2 hover:text-peach hover:decoration-peach"
          >
            <span>{a.street}</span>
            <span>
              {a.postcode} {a.city}, {a.state}
            </span>
          </a>
          <span className="mt-2">
            {site.hours.days} · {site.hours.opens}–{site.hours.closes}
          </span>
          <span>{site.hours.closed}: closed</span>
        </address>

        <div className="grid content-start gap-2 text-sm">
          <span className="mb-1 text-xs font-bold uppercase tracking-widest text-cream/60">Shop</span>
          <Link href="/shop" className="hover:text-peach">Shop all</Link>
          <Link href="/guides" className="hover:text-peach">Buying guides</Link>
          <Link href="/about" className="hover:text-peach">About us</Link>
          <Link href="/contact" className="hover:text-peach">Contact us</Link>
          <Link href="/returns" className="hover:text-peach">Returns & refunds</Link>
          <Link href="/privacy" className="hover:text-peach">Privacy policy</Link>
          <Link href="/reviews" className="hover:text-peach">Customer reviews</Link>
          <Link href="/account" className="hover:text-peach">My orders</Link>
        </div>

        <div className="grid content-start gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-cream/60">Questions?</span>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-bubble w-fit bg-terracotta text-cream"
          >
            <MessageCircle className="size-5" aria-hidden />
            WhatsApp us now
          </a>
        </div>
      </div>
      <p className="border-t border-cream/15 px-4 py-4 text-center text-xs text-cream/60">
        © {new Date().getFullYear()} {site.name}. Prices in MYR.
      </p>
    </footer>
  );
}
