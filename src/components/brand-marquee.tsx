import Image from "next/image";
import Link from "next/link";

// Logos live in public/images/brands/logos. `slug` links to the brand page when we stock it online.
const BRANDS: { name: string; file: string; slug?: string }[] = [
  { name: "Royal Canin", file: "royal-canin", slug: "royal-canin" },
  { name: "Aniamor", file: "aniamor", slug: "aniamor" },
  { name: "Robust", file: "robust", slug: "robust" },
  { name: "NexGard", file: "nexgard", slug: "nexgard" },
  { name: "Reflex", file: "reflex", slug: "reflex" },
  { name: "IQ Dog", file: "iq-dog", slug: "iq-dog" },
  { name: "Alps Natural", file: "alps-natural", slug: "alps" },
  { name: "VitalPlus", file: "vitalplus", slug: "vitaplus" },
  { name: "Wanpy", file: "wanpy", slug: "wanpy" },
  { name: "Monge", file: "monge", slug: "monge" },
  { name: "Molly", file: "molly", slug: "molly" },
  { name: "Himalaya", file: "himalaya" },
  { name: "Advantage", file: "advantage" },
  { name: "Me-O", file: "me-o" },
  { name: "SmartHeart", file: "smartheart" },
  { name: "PowerCat", file: "powercat" },
  { name: "ProBest", file: "probest" },
  { name: "belif", file: "belif" },
  { name: "Iskhan", file: "iskhan" },
  { name: "Cindy's Recipe", file: "cindys-recipe" },
];

function Logo({ brand, hidden }: { brand: (typeof BRANDS)[number]; hidden?: boolean }) {
  const img = (
    <Image
      src={`/images/brands/logos/${brand.file}.webp`}
      alt={hidden ? "" : brand.name}
      width={144}
      height={56}
      className="h-14 w-36 object-contain opacity-85 transition duration-300 group-hover/logo:scale-105 group-hover/logo:opacity-100"
    />
  );
  const cell = "group/logo grid h-20 w-44 shrink-0 place-items-center rounded-2xl bg-white/70 px-4 ring-1 ring-choc/10";
  return (
    <li aria-hidden={hidden || undefined} className="marquee-item">
      {brand.slug && !hidden ? (
        <Link href={`/brands/${brand.slug}`} className={cell} aria-label={`Shop ${brand.name}`}>
          {img}
        </Link>
      ) : (
        <span className={cell} tabIndex={-1}>
          {img}
        </span>
      )}
    </li>
  );
}

/** "Brands we carry": identical cells so every logo lines up, sliding left to right on a loop. */
export function BrandMarquee() {
  return (
    <section aria-labelledby="brands-heading" className="mx-auto max-w-6xl px-4 pt-12">
      <div className="flex items-end justify-between gap-3">
        <h2 id="brands-heading" className="font-bubble text-2xl font-extrabold text-choc">
          Brands we carry
        </h2>
        <Link href="/brands" className="text-sm font-bold text-rust underline">
          All brands
        </Link>
      </div>
      <div className="marquee mt-4 overflow-hidden rounded-3xl border-2 border-choc bg-peach/40 py-4">
        {/* Two identical runs; the track slides by exactly one run, so the loop is seamless. */}
        <ul className="marquee-track flex w-max gap-4 px-2">
          {BRANDS.map((b) => (
            <Logo key={b.file} brand={b} />
          ))}
          {BRANDS.map((b) => (
            <Logo key={`${b.file}-2`} brand={b} hidden />
          ))}
        </ul>
      </div>
    </section>
  );
}
