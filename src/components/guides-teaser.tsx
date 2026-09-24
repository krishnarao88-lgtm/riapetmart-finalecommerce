import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { guides } from "@/lib/guides";

/** Homepage teaser for the /guides content-marketing pages — same static data, no DB query. */
export function GuidesTeaser() {
  return (
    <section aria-labelledby="guides-heading" className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-rust" aria-hidden />
          <h2 id="guides-heading" className="font-bubble text-2xl font-extrabold text-choc">
            Buying guides
          </h2>
        </div>
        <Link href="/guides" className="flex items-center gap-1 text-sm font-bold text-rust">
          All guides <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="grid h-full gap-1.5 rounded-2xl border-2 border-choc bg-cream p-5 transition-transform hover:-translate-y-0.5"
            >
              <span className="font-bold text-choc">{g.title}</span>
              <span className="text-sm text-choc-2">{g.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
