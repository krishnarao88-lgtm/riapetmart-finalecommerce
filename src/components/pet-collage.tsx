import { ArrowRight, Cat, Dog, PawPrint, Rabbit } from "lucide-react";
import Link from "next/link";

const arch =
  "group relative flex min-h-52 flex-col items-center justify-end gap-2 overflow-hidden rounded-t-full rounded-b-3xl border-2 border-choc p-6 pb-5 text-center shadow-[5px_5px_0_0_var(--color-choc)] transition-transform duration-200 hover:-translate-y-1";

/** Editorial photo-collage grid: doubles as the real "shop by pet" and Clearance links. */
export function PetCollage() {
  return (
    <section aria-labelledby="collage-heading" className="mx-auto grid max-w-6xl gap-4 px-4 py-14">
      <h2 id="collage-heading" className="sr-only">
        Shop by pet
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid content-center gap-3 rounded-3xl bg-peach p-8">
          <span className="font-editorial text-3xl italic text-choc sm:text-4xl">
            Treats your dog actually deserves.
          </span>
          <p className="max-w-sm text-sm font-medium text-choc-2">
            Real ingredients, honest labels, and a batch expiry date on every bag so you know exactly what
            you&apos;re feeding.
          </p>
          <Link href="/shop?pet=dog" className="inline-flex w-fit items-center gap-1 font-bold text-rust">
            Shop dog food &amp; treats <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <Link href="/shop?pet=dog" className={`${arch} bg-rust text-cream`}>
          <PawPrint aria-hidden className="absolute right-5 top-5 size-7 rotate-[16deg] text-cream/70" />
          <Dog className="mb-2 size-20" aria-hidden strokeWidth={1.5} />
          <span className="rounded-full border-2 border-choc bg-cream px-3 py-1 text-xs font-bold text-choc">
            For dogs
          </span>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/shop?pet=cat" className={`${arch} bg-rust text-cream`}>
          <PawPrint aria-hidden className="absolute left-5 top-5 size-6 rotate-[-12deg] text-cream/70" />
          <Cat className="mb-2 size-16" aria-hidden strokeWidth={1.5} />
          <span className="rounded-full border-2 border-choc bg-cream px-3 py-1 text-xs font-bold text-choc">
            For cats
          </span>
        </Link>

        <div className="grid content-center gap-2 rounded-3xl bg-terracotta p-8 text-center">
          <span className="font-editorial text-3xl italic text-cream sm:text-4xl">Free the good stuff.</span>
          <p className="text-sm font-medium text-cream/85">Short-dated stock, honestly discounted.</p>
          <Link
            href="/shop?deal=short-dated"
            className="mx-auto mt-1 inline-flex w-fit items-center gap-1 rounded-full border-2 border-choc bg-cream px-4 py-2 text-sm font-bold text-choc"
          >
            Shop Clearance <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <Link href="/shop?pet=small_pet" className={`${arch} bg-rust text-cream`}>
          <PawPrint aria-hidden className="absolute right-5 top-6 size-6 rotate-[10deg] text-cream/70" />
          <Rabbit className="mb-2 size-16" aria-hidden strokeWidth={1.5} />
          <span className="rounded-full border-2 border-choc bg-cream px-3 py-1 text-xs font-bold text-choc">
            Small pets
          </span>
        </Link>
      </div>
    </section>
  );
}
