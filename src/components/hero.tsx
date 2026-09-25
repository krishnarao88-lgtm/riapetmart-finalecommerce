import { ArrowRight, Bone, MessageCircle, PawPrint, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { whatsappLink } from "@/lib/site";

const words = ["Happy", "pets,", "delivered", "today."];

// One tap from the hero to the four things most shoppers come for.
const quickLinks = [
  { href: "/shop?pet=dog", label: "Dog food" },
  { href: "/shop?pet=cat", label: "Cat food" },
  { href: "/shop?category=supplements", label: "Supplements" },
  { href: "/shop?deal=short-dated", label: "Clearance" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-terracotta">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-10 md:py-16">
        <div className="grid gap-5">
          <p className="w-fit rounded-full bg-cream px-3 py-1 text-xs font-bold uppercase tracking-widest text-choc">
            Rawang · Klang Valley · Nationwide
          </p>
          <h1 className="font-bubble text-[2.75rem] font-extrabold leading-[0.95] tracking-tight text-cream sm:text-6xl lg:text-[4.25rem]">
            {words.map((word, i) => (
              <span
                key={word}
                className="hero-rise mr-[0.22em] inline-block"
                style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)`, animationDelay: `${0.06 * i}s` }}
              >
                {word}
              </span>
            ))}
          </h1>
          <p className="max-w-md text-lg font-medium text-cream/90">
            Food, treats and care essentials from our neighbourhood shop, with same-day delivery across
            Selangor and KL.
          </p>
          {/* Desktop search lives here; below lg the header already shows a search row. */}
          <form action="/shop" role="search" className="hidden max-w-md items-center gap-2 rounded-full border-2 border-choc bg-cream p-1.5 pl-4 shadow-[3px_3px_0_0_var(--color-choc)] lg:flex">
            <Search className="size-5 shrink-0 text-choc-2" aria-hidden />
            <input
              type="search"
              name="q"
              placeholder="Search food, treats, brands…"
              aria-label="Search products"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent py-2 text-choc placeholder:text-choc-2/70 focus:outline-none"
            />
            <button type="submit" className="btn-bubble min-h-10 bg-terracotta px-4 text-sm text-cream">
              Search
            </button>
          </form>
          <ul className="flex flex-wrap gap-2" aria-label="Popular">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex min-h-10 items-center gap-1 rounded-full bg-cream/95 px-4 text-sm font-bold text-choc transition hover:bg-cream active:scale-95"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/shop"
                className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-cream underline-offset-4 hover:underline"
              >
                Shop all <ArrowRight className="size-4" aria-hidden />
              </Link>
            </li>
          </ul>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-2 text-sm font-semibold text-cream/90 hover:text-cream"
          >
            <MessageCircle className="size-4" aria-hidden /> Not sure what to pick? Ask us on WhatsApp
          </a>
        </div>

        {/* Warm photo-card composition, topped by the generated hero portrait. */}
        <div className="relative mx-auto hidden aspect-square w-full max-w-sm sm:block">
          <div className="absolute right-0 top-4 h-4/5 w-4/5 rounded-3xl bg-peach" aria-hidden />
          <div className="absolute left-0 top-0 h-[88%] w-[78%] overflow-hidden rounded-t-full rounded-b-3xl border-2 border-choc bg-rust shadow-[6px_6px_0_0_var(--color-choc)]">
            <Image
              src="/images/pets/hero-dog.png"
              alt="A happy golden retriever sitting against a warm terracotta backdrop"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 384px"
              className="object-cover object-top"
            />
          </div>

          <span
            style={{ transform: "rotate(-4deg)", animationDelay: "0.5s" }}
            className="hero-pop absolute -right-2 top-2 flex items-center gap-2 rounded-2xl border-2 border-choc bg-cream px-3 py-2 text-xs font-bold text-choc shadow-[3px_3px_0_0_var(--color-choc)]"
          >
            <PawPrint className="size-4 text-rust" aria-hidden /> Same-day in Klang Valley
          </span>
          <span
            style={{ transform: "rotate(3deg)", animationDelay: "0.62s" }}
            className="hero-pop absolute bottom-6 -right-4 flex items-center gap-2 rounded-2xl border-2 border-choc bg-cream px-3 py-2 text-xs font-bold text-choc shadow-[3px_3px_0_0_var(--color-choc)]"
          >
            <Bone className="size-4 text-rust" aria-hidden /> Real ingredients
          </span>

          <PawPrint
            aria-hidden
            className="absolute -left-3 bottom-10 size-8 rotate-[-18deg] text-cream/80"
            strokeWidth={1.5}
          />
          <PawPrint
            aria-hidden
            className="absolute left-10 -top-2 size-6 rotate-[14deg] text-cream/70"
            strokeWidth={1.5}
          />
        </div>
      </div>
    </section>
  );
}
