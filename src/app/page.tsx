import { Bike, Cat, Dog, PackageCheck, Rabbit, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { Hero } from "@/components/hero";

const pets = [
  { href: "/shop?pet=dog", label: "Dogs", note: "Kibble, wet food, treats", Icon: Dog, bg: "bg-sunshine" },
  { href: "/shop?pet=cat", label: "Cats", note: "Food, litter, care", Icon: Cat, bg: "bg-berry" },
  { href: "/shop?pet=small_pet", label: "Small pets", note: "Rabbits, hamsters & more", Icon: Rabbit, bg: "bg-grape text-surface" },
];

const promises = [
  { Icon: Bike, title: "Same-day delivery", body: "Selangor, KL and Putrajaya by Lalamove." },
  { Icon: PackageCheck, title: "Nationwide courier", body: "The cheapest courier to every other state." },
  { Icon: Store, title: "Free store pickup", body: "Bukit Beruntung, Rawang. Mon–Sat 10:00–19:00." },
  { Icon: ShieldCheck, title: "Secure checkout", body: "FPX, cards, GrabPay, Apple Pay and Google Pay." },
];

export default function Home() {
  return (
    <>
      <Hero />

      <section aria-labelledby="pets-heading" className="mx-auto grid max-w-6xl gap-6 px-4 pt-14">
        <h2 id="pets-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Shop by pet
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {pets.map(({ href, label, note, Icon, bg }) => (
            <li key={label}>
              <Link
                href={href}
                className={`group grid min-h-44 content-between gap-6 rounded-[var(--radius-chunk)] border-2 border-ink p-5 shadow-[var(--shadow-chunk)] transition-transform duration-200 hover:-translate-y-1 hover:-rotate-1 ${bg}`}
              >
                <Icon className="size-10" aria-hidden strokeWidth={2.25} />
                <span className="grid gap-1">
                  <span className="font-display text-2xl font-extrabold">{label}</span>
                  <span className="text-sm font-medium opacity-85">{note}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Why shop with us" className="mx-auto max-w-6xl px-4 pt-14">
        <ul className="grid gap-4 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sunk">
                <Icon className="size-5 text-grape" aria-hidden />
              </span>
              <span className="grid gap-0.5">
                <span className="font-bold">{title}</span>
                <span className="text-sm text-ink-2">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
