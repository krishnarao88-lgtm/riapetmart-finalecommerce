import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

const tips = [
  {
    title: "How much should I feed my dog or cat?",
    body: "Start with the pack's feeding guide for your pet's weight, then adjust by watching their body condition — ribs easy to feel but not visible is a good target.",
    href: "/shop?category=wet-food",
    cta: "Shop dog & cat food",
  },
  {
    title: "Reading a pet food label",
    body: "Check the life stage (puppy/kitten, adult, senior) and the first listed protein source — that's the biggest ingredient by weight.",
    href: "/shop?category=dry-food",
    cta: "Compare dry food",
  },
  {
    title: "Grooming basics for a shinier coat",
    body: "A weekly brush removes loose fur and distributes natural oils. Short-haired pets still benefit, even if it's less often.",
    href: "/shop?category=grooming-cleaning",
    cta: "Shop grooming supplies",
  },
  {
    title: "When to switch to senior food",
    body: "Most dogs and cats benefit from a senior formula from around 7 years old, or earlier for large dog breeds — ask us in-store if you're unsure.",
    href: "/shop?category=supplements",
    cta: "Shop supplements",
  },
];

/** Generic, evergreen pet-care guidance — no medical claims, each tip links to a real /shop filter. */
export function PetCareTips() {
  return (
    <section aria-labelledby="tips-heading" className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-rust" aria-hidden />
        <h2 id="tips-heading" className="font-bubble text-2xl font-extrabold text-choc">
          Pet care tips
        </h2>
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {tips.map((tip) => (
          <li key={tip.title} className="grid gap-2 rounded-2xl border-2 border-choc bg-cream p-5">
            <span className="font-bold text-choc">{tip.title}</span>
            <span className="text-sm text-choc-2">{tip.body}</span>
            <Link href={tip.href} className="mt-1 flex w-fit items-center gap-1 text-sm font-bold text-rust">
              {tip.cta} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
