import { PawPrint, Search, Tag } from "lucide-react";
import Link from "next/link";
import { AccountLink } from "@/components/account-link";
import { CartBadge } from "@/components/cart-badge";
import { MobileMenu } from "@/components/mobile-menu";
import { whatsappLink } from "@/lib/site";

// Clearance is raised like a sticker so it stands out from the plain links.
const HOT = "border-2 border-choc bg-terracotta text-cream shadow-[2px_2px_0_0_var(--color-choc)] hover:-translate-y-0.5 hover:bg-terracotta hover:text-cream";

const nav: { href: string; label: string; hot?: boolean }[] = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?deal=short-dated", label: "Clearance", hot: true },
  { href: "/cat-hotel", label: "Cat Hotel" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
];

function SearchForm({ className }: { className: string }) {
  return (
    <form action="/shop" role="search" className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-choc-2" aria-hidden />
      <input
        type="search"
        name="q"
        placeholder="Search food, brands…"
        aria-label="Search products"
        enterKeyHint="search"
        className="min-h-11 w-full rounded-full border-2 border-choc bg-cream py-2 pl-9 pr-4 text-sm text-choc placeholder:text-choc-2/70 lg:min-h-0"
      />
    </form>
  );
}

/**
 * Only the logo / account / cart row stays pinned while scrolling, so on phones the header never
 * takes more than ~64px. Search and the category pills sit below it and scroll away normally.
 */
export function SiteHeader() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b-2 border-rust/20 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-x-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2" aria-label="Ria Pet Mart home">
            <span className="grid size-10 place-items-center rounded-full bg-terracotta text-cream shadow-[2px_2px_0_0_var(--color-choc)]">
              <PawPrint className="size-5" aria-hidden />
            </span>
            <span className="font-bubble text-xl font-extrabold leading-none tracking-tight text-choc">
              ria<span className="text-rust">petmart</span>
            </span>
          </Link>

          <nav aria-label="Main" className="ml-auto hidden md:block">
            <ul className="flex items-center gap-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-transform ${item.hot ? HOT : "text-choc-2 hover:bg-peach/50 hover:text-choc"}`}
                  >
                    {item.hot && <Tag className="size-3.5" aria-hidden />}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <SearchForm className="hidden lg:block lg:w-44" />
          <span className="ml-auto md:hidden" aria-hidden />
          <AccountLink />
          <CartBadge />
          <MobileMenu
            links={[...nav, { href: "/guides", label: "Buying guides" }, { href: "/reviews", label: "Reviews" }]}
            whatsappHref={whatsappLink()}
          />
        </div>
      </header>

      {/* Below lg: search on its own row (phones keep Clearance beside it; everything else is in the ☰ menu). Not pinned. */}
      <div className="border-b-2 border-rust/10 bg-cream lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <SearchForm className="min-w-0 flex-1" />
          <Link
            href="/shop?deal=short-dated"
            className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3.5 text-sm font-semibold md:hidden ${HOT}`}
          >
            <Tag className="size-3.5" aria-hidden />
            Clearance
          </Link>
        </div>
      </div>
    </>
  );
}
