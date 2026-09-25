import { ArrowRight, PawPrint } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// self-start + a fixed height stop the card from being stretched tall by its taller
// text-panel sibling in the same grid row — that stretch was pushing the crop window
// down into empty headroom, cropping the animal almost entirely out of frame.
const arch =
  "group relative flex h-72 self-start flex-col items-center justify-end gap-2 overflow-hidden rounded-t-full rounded-b-3xl border-2 border-choc p-6 pb-5 text-center shadow-[5px_5px_0_0_var(--color-choc)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:rotate-1 hover:shadow-[7px_9px_0_0_var(--color-choc)]";
const archImage = "object-cover transition-transform duration-500 ease-out group-hover:scale-110";
const archSticker =
  "absolute drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out group-hover:scale-125 group-hover:rotate-[20deg]";
const archBadge =
  "relative rounded-full border-2 border-choc bg-cream px-3 py-1 text-xs font-bold text-choc transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105";
const cardSizes = "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw";

/** Editorial photo-collage grid: doubles as the real "shop by pet" and Clearance links. */
export function PetCollage() {
  return (
    <section aria-labelledby="collage-heading" className="mx-auto grid max-w-6xl gap-4 px-4 py-14">
      <h2 id="collage-heading" className="sr-only">
        Shop by pet
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="group grid content-center gap-3 rounded-3xl bg-peach p-8">
          <span className="font-bubble text-3xl font-extrabold leading-tight text-choc sm:text-4xl">
            Treats your dog actually deserves.
          </span>
          <p className="max-w-sm text-sm font-medium text-choc-2">
            Real ingredients, honest labels, and a batch expiry date on every bag so you know exactly what
            you&apos;re feeding.
          </p>
          <Link href="/shop?pet=dog" className="inline-flex w-fit items-center gap-1 font-bold text-rust">
            Shop dog food &amp; treats{" "}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        {/* The collie sits in the middle of a tall photo: frame on its head and body, and give this
            wide arch more height on larger screens so the dog isn't cut down to its ears. */}
        <Link href="/shop?pet=dog" className={`${arch} bg-rust text-cream md:h-96`}>
          <Image
            src="/images/pets/card-dog.png"
            alt="A cheerful border collie with perked ears"
            fill
            sizes={cardSizes}
            className={`${archImage} object-[50%_42%]`}
          />
          <PawPrint aria-hidden className={`${archSticker} right-5 top-5 size-7 rotate-[16deg] text-cream/85`} />
          <span className={archBadge}>For dogs</span>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/shop?pet=cat" className={`${arch} bg-rust text-cream`}>
          <Image
            src="/images/pets/card-cat.png"
            alt="A curious tabby cat sitting upright"
            fill
            sizes={cardSizes}
            className={`${archImage} object-[50%_60%]`}
          />
          <PawPrint aria-hidden className={`${archSticker} left-5 top-5 size-6 rotate-[-12deg] text-cream/85`} />
          <span className={archBadge}>For cats</span>
        </Link>

        <div className="group grid content-center gap-2 rounded-3xl bg-terracotta p-8 text-center transition-transform duration-300 hover:-translate-y-1">
          <span className="font-bubble text-3xl font-extrabold leading-tight text-cream sm:text-4xl">Free the good stuff.</span>
          <p className="text-sm font-medium text-cream/85">Short-dated stock, honestly discounted.</p>
          <Link
            href="/shop?deal=short-dated"
            className="mx-auto mt-1 inline-flex w-fit items-center gap-1 rounded-full border-2 border-choc bg-cream px-4 py-2 text-sm font-bold text-choc transition-transform duration-300 group-hover:scale-105"
          >
            Shop Clearance{" "}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <Link href="/shop?pet=small_pet" className={`${arch} bg-rust text-cream`}>
          <Image
            src="/images/pets/card-small-pet.png"
            alt="An alert grey rabbit with ears up"
            fill
            sizes={cardSizes}
            className={`${archImage} object-bottom`}
          />
          <PawPrint aria-hidden className={`${archSticker} right-5 top-6 size-6 rotate-[10deg] text-cream/85`} />
          <span className={archBadge}>Small pets</span>
        </Link>
      </div>
    </section>
  );
}
