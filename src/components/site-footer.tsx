import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { site, whatsappLink } from "@/lib/site";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      ["/shop", "Shop all"],
      ["/cat-hotel", "Cat hotel"],
      ["/guides", "Buying guides"],
      ["/reviews", "Reviews"],
    ],
  },
  {
    title: "Help",
    links: [
      ["/account", "My orders"],
      ["/contact", "Contact us"],
      ["/returns", "Returns & refunds"],
      ["/about", "About us"],
    ],
  },
] as const;

export function SiteFooter() {
  const a = site.address;
  return (
    <footer className="mt-16 bg-rust text-sm text-cream">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="col-span-2 grid content-start gap-2 sm:col-span-1">
          <p className="font-bubble text-xl font-extrabold">
            ria<span className="text-peach">petmart</span>
          </p>
          <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="w-fit text-cream/80 hover:text-peach">
            {a.street}, {a.postcode} {a.city}
          </a>
          <p className="text-cream/80">
            {site.hours.days} {site.hours.opens}–{site.hours.closes} · {site.hours.closed} closed
          </p>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-cream/10 px-3 py-1.5 font-semibold hover:bg-cream/20"
          >
            <MessageCircle className="size-4" aria-hidden />
            WhatsApp {site.phone}
          </a>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="grid content-start gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-cream/60">{col.title}</span>
            {col.links.map(([href, label]) => (
              <Link key={href} href={href} className="w-fit text-cream/85 hover:text-peach">
                {label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      <div className="border-t border-cream/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-xs text-cream/60">
          <span>
            © {new Date().getFullYear()} {site.name} · Prices in MYR
          </span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-peach">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-peach">
              Terms
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
