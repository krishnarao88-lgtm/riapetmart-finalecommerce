import Image from "next/image";
import Link from "next/link";

// Logos live in public/images/brands/logos. `slug` links to the brand page when we stock it online.
const BRANDS: { name: string; file: string; w: number; h: number; weight?: number; slug?: string }[] = [
  { name: "Royal Canin", file: "royal-canin", w: 297, h: 80, slug: "royal-canin" },
  { name: "Aniamor", file: "aniamor", w: 309, h: 160, slug: "aniamor" },
  { name: "Robust", file: "robust", w: 396, h: 160, weight: 0.85, slug: "robust" },
  { name: "NexGard", file: "nexgard", w: 383, h: 71, slug: "nexgard" },
  { name: "Reflex", file: "reflex", w: 221, h: 123, slug: "reflex" },
  { name: "IQ Dog", file: "iq-dog", w: 216, h: 114, slug: "iq-dog" },
  { name: "Alps Natural", file: "alps-natural", w: 239, h: 115, weight: 1.1, slug: "alps" },
  { name: "VitalPlus", file: "vitalplus", w: 325, h: 109, slug: "vitaplus" },
  { name: "Wanpy", file: "wanpy", w: 210, h: 160, slug: "wanpy" },
  { name: "Monge", file: "monge", w: 282, h: 79, weight: 0.9, slug: "monge" },
  { name: "Molly", file: "molly", w: 436, h: 145, weight: 0.85, slug: "molly" },
  { name: "Himalaya", file: "himalaya", w: 253, h: 91 },
  { name: "Advantage", file: "advantage", w: 330, h: 62 },
  { name: "Me-O", file: "me-o", w: 246, h: 99, weight: 0.78 },
  { name: "SmartHeart", file: "smartheart", w: 146, h: 160, weight: 1.2 },
  { name: "PowerCat", file: "powercat", w: 274, h: 93 },
  { name: "ProBest", file: "probest", w: 304, h: 53, weight: 0.9 },
  { name: "belif", file: "belif", w: 198, h: 133 },
  { name: "Iskhan", file: "iskhan", w: 272, h: 90, weight: 0.9 },
  { name: "Cindy's Recipe", file: "cindys-recipe", w: 223, h: 100, weight: 1.05 },
];

/**
 * Optical sizing: every logo gets about the same visual area rather than the same box, so wide
 * wordmarks aren't tiny and tall badges aren't huge. `weight` trims unusually heavy/bold marks.
 */
const TARGET_AREA = 3300; // px², roughly a 110×30 wordmark
function logoSize({ w, h, weight = 1 }: { w: number; h: number; weight?: number }) {
  const ratio = w / h;
  let width = Math.sqrt(TARGET_AREA * weight * ratio);
  let height = width / ratio;
  if (width > 140) [width, height] = [140, 140 / ratio];
  if (height > 58) [width, height] = [58 * ratio, 58];
  return { width: Math.round(width), height: Math.round(height) };
}

function Logo({ brand, hidden }: { brand: (typeof BRANDS)[number]; hidden?: boolean }) {
  const size = logoSize(brand);
  const img = (
    <Image
      src={`/images/brands/logos/${brand.file}.webp`}
      alt={hidden ? "" : brand.name}
      width={size.width}
      height={size.height}
      style={size}
      className="object-contain opacity-90 transition duration-300 group-hover/logo:scale-105 group-hover/logo:opacity-100"
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
      <div className="marquee mt-4 overflow-hidden rounded-3xl card-soft bg-peach/40 py-4">
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
