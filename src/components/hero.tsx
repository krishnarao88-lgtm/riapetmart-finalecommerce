import { ArrowRight, Bone, MessageCircle, PawPrint } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { whatsappLink } from "@/lib/site";

const words = ["Happy", "pets,", "delivered", "today."];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-terracotta">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.15fr_1fr] md:items-center md:py-20">
        <div className="grid gap-6">
          <p className="w-fit rounded-full bg-cream px-3 py-1 text-xs font-bold uppercase tracking-widest text-choc">
            Rawang · Klang Valley · Nationwide
          </p>
          <h1 className="font-bubble text-5xl font-extrabold leading-[0.95] tracking-tight text-cream sm:text-6xl lg:text-7xl">
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
          <div className="flex flex-wrap gap-3">
            <Link href="/shop" className="btn-bubble bg-cream text-choc">
              Shop all products <ArrowRight className="size-5" aria-hidden />
            </Link>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn-bubble bg-rust text-cream">
              <MessageCircle className="size-5" aria-hidden /> Ask on WhatsApp
            </a>
          </div>
        </div>

        {/* Warm photo-card composition, topped by the generated hero portrait. */}
        <div className="relative mx-auto aspect-square w-full max-w-sm">
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
