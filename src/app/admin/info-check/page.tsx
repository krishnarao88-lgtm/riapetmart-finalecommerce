import type { Metadata } from "next";
import Link from "next/link";
import { btnPrimary, btnSecondary, PageHeader, pageWrap } from "@/components/admin/form-parts";
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
    <div className={pageWrap}>
      <PageHeader
        title="Info check"
        description={
          <>
            Corrections found by comparing our product pages with the manufacturer&apos;s own information. Nothing
            changes on the shop until you approve it. {verified ?? 0} of {total ?? 0} live products verified.
          </>
        }
      />

      {checks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-ink-2">Nothing waiting for review.</p>
      ) : (
        <ul className="grid gap-4">
          {checks.map((c) => (
            <li key={c.id} className="grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-chunk)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/shop/${c.products?.slug}`} target="_blank" className="font-bold text-choc underline decoration-line underline-offset-2 hover:text-terracotta-deep">
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
                <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-semibold text-terracotta-deep underline">
                  Source: {new URL(c.source_url).hostname}
                </a>
              )}
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                {(["approve", "reject"] as const).map((d) => (
                  <form key={d} action={decideInfoCheck}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="decision" value={d} />
                    <button
                      type="submit"
                      className={d === "approve" ? btnPrimary : btnSecondary}
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
