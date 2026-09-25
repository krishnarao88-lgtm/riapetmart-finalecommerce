"use client";

import { Menu, MessageCircle, Tag, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type MenuLink = { href: string; label: string; hot?: boolean };

/** Phone ☰ menu: a panel that drops under the pinned header. Closes on navigation, Esc or tapping outside. */
export function MobileMenu({ links, whatsappHref }: { links: MenuLink[]; whatsappHref: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the page changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const item = "flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-choc hover:bg-peach/40";

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="grid size-11 place-items-center rounded-full border-2 border-choc bg-cream text-choc"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 z-30 bg-choc/30"
          />
          <nav
            id="mobile-menu"
            aria-label="Menu"
            className="absolute inset-x-0 top-full z-40 border-b-2 border-rust/20 bg-cream px-4 pb-4 pt-2 shadow-[0_16px_30px_-18px_rgb(46_29_20/0.5)]"
          >
            <ul className="grid gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={`${item} ${l.hot ? "text-rust" : ""}`}>
                    {l.hot && <Tag className="size-4" aria-hidden />}
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t-2 border-rust/10 pt-3">
              <Link
                href="/account"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-2 border-choc bg-cream text-sm font-bold text-choc"
              >
                <UserRound className="size-4" aria-hidden /> Log in / My orders
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-terracotta text-sm font-bold text-cream"
              >
                <MessageCircle className="size-4" aria-hidden /> WhatsApp us
              </a>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
