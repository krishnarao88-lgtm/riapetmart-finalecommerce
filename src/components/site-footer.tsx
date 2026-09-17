import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { site, whatsappLink } from "@/lib/site";

export function SiteFooter() {
  const a = site.address;
  return (
    <footer className="mt-16 border-t-2 border-ink bg-ink text-ground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-3">
          <p className="font-display text-2xl font-extrabold">
            ria<span className="text-sunshine">petmart</span>
          </p>
          <p className="text-sm text-ground/75">{site.tagline}</p>
        </div>

        <address className="grid content-start gap-1 text-sm not-italic text-ground/85">
          <span className="mb-1 text-xs font-bold uppercase tracking-widest text-ground/60">Visit the shop</span>
          <span>{a.street}</span>
          <span>
            {a.postcode} {a.city}, {a.state}
          </span>
          <span className="mt-2">
            {site.hours.days} · {site.hours.opens}–{site.hours.closes}
          </span>
          <span>{site.hours.closed}: closed</span>
        </address>

        <div className="grid content-start gap-2 text-sm">
          <span className="mb-1 text-xs font-bold uppercase tracking-widest text-ground/60">Shop</span>
          <Link href="/shop" className="hover:text-sunshine">Shop all</Link>
          <Link href="/about" className="hover:text-sunshine">About us</Link>
          <Link href="/contact" className="hover:text-sunshine">Contact us</Link>
        </div>

        <div className="grid content-start gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-ground/60">Questions?</span>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-chunk w-fit border-ground bg-lagoon text-ink shadow-none"
          >
            <MessageCircle className="size-5" aria-hidden />
            WhatsApp {site.phone}
          </a>
        </div>
      </div>
      <p className="border-t border-ground/15 px-4 py-4 text-center text-xs text-ground/60">
        © {new Date().getFullYear()} {site.name}. Prices in MYR.
      </p>
    </footer>
  );
}
