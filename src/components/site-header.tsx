import { PawPrint } from "lucide-react";
import Link from "next/link";
import { CartBadge } from "@/components/cart-badge";

const nav = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?pet=dog", label: "Dogs" },
  { href: "/shop?pet=cat", label: "Cats" },
  { href: "/shop?deal=short-dated", label: "Clearance" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-rust/20 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
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
                  className="rounded-full px-3 py-2 text-sm font-semibold text-choc-2 hover:bg-peach/50 hover:text-choc"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <CartBadge />
      </div>

      {/* Phones: nav scrolls sideways inside its own strip, never the page. */}
      <nav aria-label="Main" className="md:hidden">
        <ul className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {nav.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className="inline-flex min-h-11 items-center rounded-full border-2 border-peach bg-cream px-4 text-sm font-semibold text-choc"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
