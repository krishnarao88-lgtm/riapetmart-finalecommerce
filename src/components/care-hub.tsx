import {
  ArrowRight,
  Bean,
  Bone,
  BookOpen,
  Droplets,
  FlaskConical,
  GlassWater,
  Leaf,
  ShieldPlus,
  Smile,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { careNeeds, NEED_LABELS } from "@/lib/care-needs";
import { guides } from "@/lib/guides";
import { createPublicClient } from "@/lib/supabase/public";

const NEED_ICONS: Record<string, LucideIcon> = {
  skin: Sparkles,
  joint: Bone,
  digestion: Leaf,
  urinary: Droplets,
  kidney: Bean,
  dental: Smile,
  immunity: ShieldPlus,
  liver: FlaskConical,
  hydration: GlassWater,
};

const TIPS = [
  {
    q: "How much should I feed my dog or cat?",
    a: "Start with the pack's feeding guide for your pet's weight, then adjust by body condition: ribs easy to feel but not visible is a good target.",
  },
  {
    q: "How do I read a pet food label?",
    a: "Check the life stage (puppy/kitten, adult, senior) and the first listed protein: that's the biggest ingredient by weight.",
  },
  {
    q: "How often should I brush my pet?",
    a: "A weekly brush removes loose fur and spreads natural oils. Short-haired pets still benefit, just less often.",
  },
  {
    q: "When should I switch to senior food?",
    a: "Most dogs and cats benefit from around 7 years old, earlier for large dog breeds. Ask us in-store if unsure.",
  },
];

/**
 * One home for pet-care help: buying guides and quick tips on the left, "Shop by need" tiles on the
 * right (real product counts, matched the same way as the bundle pairing). Replaces two text-only rows.
 */
export async function CareHub() {
  const supabase = createPublicClient();
  const { data } = await supabase.from("products").select("name, highlights").eq("status", "published");
  const counts = new Map<string, number>();
  for (const p of data ?? []) for (const need of careNeeds(p)) counts.set(need, (counts.get(need) ?? 0) + 1);
  const needs = Object.keys(NEED_LABELS)
    .filter((n) => (counts.get(n) ?? 0) > 0)
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
    .slice(0, 6);

  return (
    <section aria-labelledby="care-heading" className="mx-auto max-w-6xl px-4 pt-12">
      <h2 id="care-heading" className="font-bubble text-2xl font-extrabold text-choc">
        Care guides &amp; shop by need
      </h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="card-soft reveal grid content-start gap-4 rounded-3xl bg-peach/40 p-6">
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-rust">
            <BookOpen className="size-4" aria-hidden /> Buying guides
          </span>
          <ul className="grid gap-2">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl bg-cream/80 px-4 py-3 transition hover:bg-cream active:scale-[0.99]"
                >
                  <span className="grid gap-0.5">
                    <span className="font-bold text-choc">{g.title}</span>
                    <span className="line-clamp-1 text-sm text-choc-2">{g.description}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-rust transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <div className="grid gap-1 border-t border-choc/10 pt-3">
            <span className="text-sm font-bold uppercase tracking-widest text-rust">Quick tips</span>
            {TIPS.map((t) => (
              <details key={t.q} className="group rounded-xl px-1 py-1.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-choc">
                  {t.q}
                  <span className="text-rust transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-1.5 text-sm leading-relaxed text-choc-2">{t.a}</p>
              </details>
            ))}
          </div>
          <Link href="/guides" className="flex w-fit items-center gap-1 text-sm font-bold text-rust">
            All guides <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
          {needs.map((need) => {
            const Icon = NEED_ICONS[need] ?? Sparkles;
            return (
              <li key={need} className="reveal">
                <Link
                  href={`/shop?need=${need}`}
                  className="card-soft group grid h-full content-between gap-6 rounded-3xl bg-surface p-5 transition hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-peach/60 text-rust transition-transform group-hover:scale-110">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="grid gap-0.5">
                    <span className="font-bold leading-tight text-choc">{NEED_LABELS[need]}</span>
                    <span className="text-xs text-choc-2">{counts.get(need)} products</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
