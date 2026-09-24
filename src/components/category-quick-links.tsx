import { Bath, Cat, Dog, HeartPulse, Percent, Rabbit, ShoppingBag, Bone } from "lucide-react";
import Link from "next/link";

const links = [
  { href: "/shop?pet=dog", label: "Dogs", Icon: Dog },
  { href: "/shop?pet=cat", label: "Cats", Icon: Cat },
  { href: "/shop?pet=small_pet", label: "Small pets", Icon: Rabbit },
  { href: "/shop?category=treats", label: "Treats", Icon: Bone },
  { href: "/shop?category=grooming-cleaning", label: "Grooming", Icon: Bath },
  { href: "/shop?category=pet-health-medication", label: "Health", Icon: HeartPulse },
  { href: "/shop?category=pet-supplies", label: "Supplies", Icon: ShoppingBag },
  { href: "/shop?deal=short-dated", label: "Clearance", Icon: Percent },
];

/** Icon quick-links to shop by pet/category/deal — every href matches a real /shop filter. */
export function CategoryQuickLinks() {
  return (
    <nav aria-label="Shop by category" className="mx-auto max-w-6xl px-4 pt-8">
      <ul className="flex flex-wrap justify-center gap-4 sm:gap-6">
        {links.map(({ href, label, Icon }) => (
          <li key={label}>
            <Link href={href} className="group flex w-16 flex-col items-center gap-1.5 text-center sm:w-20">
              <span className="grid size-14 place-items-center rounded-full border-2 border-choc bg-peach transition-transform group-hover:-translate-y-0.5 sm:size-16">
                <Icon className="size-6 text-rust sm:size-7" aria-hidden />
              </span>
              <span className="text-xs font-semibold text-choc">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
