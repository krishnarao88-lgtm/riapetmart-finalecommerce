import { ArrowRight, Bone, MessageCircle, PawPrint, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HeroParallax } from "@/components/hero-parallax";
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
      {/* A little trail of paw prints trotting across the background */}
      <div className="pointer-events-none absolute bottom-6 left-[4%] hidden gap-10 md:flex" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <PawPrint
            key={i}
            className="paw-step size-6 text-cream/40"
            strokeWidth={1.5}
            style={{ animationDelay: `${i * 0.45}s`, transform: `translateY(${i % 2 ? -10 : 6}px) rotate(80deg)` }}
          />
        ))}
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-10 md:py-16">
        <div className="grid gap-5">
          <p className="w-fit rounded-full bg-cream px-3 py-1 text-xs font-bold uppercase tracking-widest text-choc">
            Rawang · Klang Valley · Nationwide
          </p>
          <h1 className="font-bubble text-[2.75rem] font-extrabold leading-[0.95] tracking-tight text-cream sm:text-6xl lg:text-[4.25rem]">
            {words.map((word, i) => (
              <span
                key={word}
                className="hero-rise relative mr-[0.22em] inline-block"
                style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)`, animationDelay: `${0.06 * i}s` }}
              >
                {word}
                {i === words.length - 1 && (
                  // Hand-drawn squiggle that draws itself under "today."
                  <svg viewBox="0 0 200 20" className="absolute -bottom-3 left-0 h-3 w-[92%] text-sunshine" aria-hidden>
                    <path
                      className="hero-squiggle"
                      d="M3 12 Q 28 2 52 11 T 101 11 T 150 11 T 197 9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
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

        {/* Playful shop-window scene: the dog on stage, the cat peeking in, real own-brand products
            bobbing around. Layers drift with the mouse at different depths (HeroParallax). */}
        <HeroParallax className="hero-scene relative mx-auto aspect-square w-full max-w-[18rem] sm:max-w-md">
          <div className="depth-1 absolute inset-[6%] rounded-[42%_58%_52%_48%/48%_44%_56%_52%] bg-peach" aria-hidden />

          <div className="depth-2 absolute left-[14%] top-[10%] h-[74%] w-[62%]">
            <div className="hero-rise size-full overflow-hidden rounded-t-full rounded-b-3xl border-2 border-choc bg-rust shadow-[6px_6px_0_0_var(--color-choc)]">
              <Image
                src="/images/pets/hero-dog.png"
                alt="A happy golden retriever sitting against a warm terracotta backdrop"
                fill
                priority
                sizes="(max-width: 640px) 60vw, 280px"
                className="object-cover object-top"
              />
            </div>
          </div>

          {/* The cat peeking through a round window */}
          <div className="depth-3 absolute -left-[2%] top-[4%] size-[28%]">
            <div className="hero-peek size-full overflow-hidden rounded-full border-2 border-choc bg-rust shadow-[3px_3px_0_0_var(--color-choc)]">
              <Image src="/images/pets/card-cat.png" alt="" fill sizes="160px" className="origin-[50%_42%] scale-[1.9] object-cover object-[50%_42%]" />
            </div>
          </div>

          {/* The dog asks the obvious question */}
          <div className="depth-3 absolute right-[2%] top-[14%]">
            <span className="hero-wiggle relative block rounded-2xl border-2 border-choc bg-cream px-3 py-1.5 font-bubble text-sm font-extrabold text-choc shadow-[3px_3px_0_0_var(--color-choc)] sm:text-base">
              Treat time?
              <span
                className="absolute -bottom-[9px] left-4 size-4 rotate-45 border-b-2 border-r-2 border-choc bg-cream"
                aria-hidden
              />
            </span>
          </div>

          {/* Real own-brand products, each a link */}
          <Link
            href="/shop/robust-hearty-treats-skin-coat-500g"
            aria-label="Shop Robust Hearty Treats"
            className="depth-4 absolute -left-[4%] bottom-[2%] w-[30%]"
          >
            <span className="hero-float block" style={{ animationDelay: "-1s" }}>
              <Image
                src="/images/products/robust-hearty-treats-skin-coat-500g.webp"
                alt=""
                width={200}
                height={200}
                className="hero-product rotate-[-10deg]"
              />
            </span>
          </Link>
          <Link
            href="/shop/aniamor-skin-and-coat-syrup"
            aria-label="Shop Aniamor Skin & Coat Syrup"
            className="depth-5 absolute -right-[4%] top-[42%] w-[24%]"
          >
            <span className="hero-float block" style={{ animationDelay: "-2.6s", animationDuration: "5.2s" }}>
              <Image
                src="/images/products/aniamor-skin-and-coat-syrup.webp"
                alt=""
                width={160}
                height={160}
                className="hero-product rotate-[8deg]"
              />
            </span>
          </Link>
          <Link
            href="/shop/alps-chunky-lamb-415gm"
            aria-label="Shop Alps Chunky Lamb"
            className="depth-4 absolute bottom-[0%] right-[14%] w-[24%]"
          >
            <span className="hero-float block" style={{ animationDelay: "-0.4s", animationDuration: "4.4s" }}>
              <Image
                src="/images/products/alps-chunky-lamb-415gm.webp"
                alt=""
                width={160}
                height={160}
                className="hero-product rotate-[-4deg]"
              />
            </span>
          </Link>

          <span
            style={{ transform: "rotate(3deg)", animationDelay: "0.6s" }}
            className="depth-3 hero-pop absolute -bottom-[3%] left-[26%] hidden items-center gap-2 rounded-2xl border-2 border-choc bg-cream px-3 py-1.5 text-xs font-bold text-choc shadow-[3px_3px_0_0_var(--color-choc)] sm:flex"
          >
            <PawPrint className="size-4 text-rust" aria-hidden /> Same-day in Klang Valley
          </span>
          <Bone aria-hidden className="depth-2 hero-spin absolute right-[18%] top-[2%] size-7 text-cream/80" strokeWidth={1.5} />
        </HeroParallax>
      </div>
    </section>
  );
}
