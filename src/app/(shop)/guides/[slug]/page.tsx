import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGuide, guides } from "@/lib/guides";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.description, alternates: { canonical: `/guides/${slug}` } };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/guides" className="text-sm font-semibold text-rust">
        ← All guides
      </Link>
      <h1 className="mt-2 font-bubble text-3xl font-extrabold text-choc">{guide.title}</h1>
      <p className="mt-3 text-choc-2">{guide.intro}</p>

      <div className="mt-6 grid gap-6">
        {guide.sections.map((s) => (
          <div key={s.heading} className="grid gap-1.5">
            <h2 className="font-bubble text-xl font-extrabold text-choc">{s.heading}</h2>
            <p className="text-choc-2">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-2 rounded-2xl border-2 border-choc bg-peach/40 p-5">
        <p className="font-bold text-choc">Shop what&apos;s in this guide</p>
        <div className="flex flex-wrap gap-2">
          {guide.shopLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1 rounded-full border-2 border-choc bg-terracotta px-4 py-2 text-sm font-bold text-cream"
            >
              {link.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
