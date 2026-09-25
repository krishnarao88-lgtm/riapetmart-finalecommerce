import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Buying guides",
  description: "Practical, honest buying guides for dog food, cat food and pet essentials in Malaysia.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-2">
        <BookOpen className="size-6 text-rust" aria-hidden />
        <h1 className="font-bubble text-3xl font-extrabold text-choc">Buying guides</h1>
      </div>
      <p className="mt-2 max-w-xl text-choc-2">
        Practical guides to help you choose the right food, litter and essentials for your pet — written by us,
        linking to what we actually stock.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="group flex h-full flex-col gap-2 rounded-2xl border-2 border-choc bg-surface p-5 transition-transform hover:-translate-y-0.5"
            >
              <span className="font-bubble text-lg font-extrabold text-choc">{g.title}</span>
              <span className="text-sm text-choc-2">{g.description}</span>
              <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-bold text-rust">
                Read guide <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
