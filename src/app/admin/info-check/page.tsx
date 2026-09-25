import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { decideInfoCheck } from "./actions";

export const metadata: Metadata = { title: "Info check", robots: { index: false } };

type Check = {
  id: string;
  field: "description" | "ingredients" | "usage" | "highlights";
  current_text: string | null;
  proposed_text: string | null;
  source_url: string | null;
  note: string | null;
  products: { name: string; slug: string } | null;
};

const FIELD_LABEL = { description: "Description", ingredients: "Ingredients", usage: "Dosage / how to use", highlights: "Benefit tags" };

export default async function InfoCheckPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { count: verified }, { count: total }] = await Promise.all([
    supabase
      .from("product_info_checks")
      .select("id, field, current_text, proposed_text, source_url, note, products(name, slug)")
      .eq("status", "pending")
      .order("created_at"),
    supabase.from("products").select("id", { count: "exact", head: true }).not("info_verified_at", "is", null),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  const checks = (data ?? []) as unknown as Check[];

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Info check</h1>
        <p className="text-ink-2">
          Corrections found by comparing our product pages with the manufacturer&apos;s own information. Nothing
          changes on the shop until you approve it. {verified ?? 0} of {total ?? 0} live products verified.
        </p>
      </div>

      {checks.length === 0 ? (
        <p className="rounded-2xl border-2 border-line bg-surface p-6 text-ink-2">Nothing waiting for review.</p>
      ) : (
        <ul className="grid gap-4">
          {checks.map((c) => (
            <li key={c.id} className="grid gap-3 rounded-2xl border-2 border-line bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/shop/${c.products?.slug}`} target="_blank" className="font-bold underline">
                  {c.products?.name}
                </Link>
                <span className="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-bold text-warn-fg">{FIELD_LABEL[c.field]}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid content-start gap-1">
                  <span className="text-xs font-bold uppercase text-bad-fg">Now on the shop</span>
                  <p className="whitespace-pre-line rounded-xl bg-bad-bg/40 p-3 text-sm">{c.current_text || "(empty)"}</p>
                </div>
                <div className="grid content-start gap-1">
                  <span className="text-xs font-bold uppercase text-ok-fg">Checked version</span>
                  <p className="whitespace-pre-line rounded-xl bg-ok-bg/40 p-3 text-sm">
                    {c.proposed_text || "(remove — no official source supports this)"}
                  </p>
                </div>
              </div>
              {c.note && <p className="text-sm text-ink-2">{c.note}</p>}
              {c.source_url && (
                <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-semibold text-rust underline">
                  Source: {new URL(c.source_url).hostname}
                </a>
              )}
              <div className="flex gap-2">
                {(["approve", "reject"] as const).map((d) => (
                  <form key={d} action={decideInfoCheck}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="decision" value={d} />
                    <button
                      type="submit"
                      className={`min-h-9 rounded-full px-4 text-sm font-semibold ${d === "approve" ? "bg-ok-bg text-ok-fg" : "bg-bad-bg text-bad-fg"}`}
                    >
                      {d === "approve" ? "Approve" : "Reject"}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
