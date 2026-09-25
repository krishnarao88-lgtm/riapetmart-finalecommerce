import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { unitProfit } from "@/lib/finance";
import { formatMyr } from "@/lib/pricing";
import { decidePriceSuggestion } from "./actions";

export const metadata: Metadata = { title: "Price suggestions", robots: { index: false } };

type Suggestion = {
  id: string;
  current_price: number;
  suggested_price: number;
  market_low: number | null;
  market_high: number | null;
  sources: { name: string; url: string; price: number }[];
  reason: string | null;
  created_at: string;
  variants: {
    title: string;
    price: number;
    products: { name: string; slug: string } | null;
    variant_costs: { cost_price: number } | null;
  } | null;
};

function Margin({ price, cost }: { price: number; cost: number | null }) {
  if (!cost) return <span className="text-ink-2">no cost price</span>;
  const profit = unitProfit(price, cost);
  const pct = Math.round((profit / price) * 100);
  return (
    <span className={profit < 0 ? "text-bad-fg" : pct < 10 ? "text-warn-fg" : "text-ok-fg"}>
      {formatMyr(profit)} profit ({pct}%)
    </span>
  );
}

export default async function PricingPage({ searchParams }: PageProps<"/admin/pricing">) {
  const { error } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("price_suggestions")
    .select(
      "id, current_price, suggested_price, market_low, market_high, sources, reason, created_at, variants(title, price, products(name, slug), variant_costs(cost_price))",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Suggestion[];

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Price suggestions</h1>
        <p className="text-ink-2">
          Prices checked against what other Malaysian shops charge for the same product. Nothing changes until you
          approve, and a price is never approved below cost plus 5% after the card fee.
        </p>
      </div>

      {error === "floor" && (
        <p role="alert" className="rounded-xl bg-bad-bg p-3 text-sm font-semibold text-bad-fg">
          That price would leave less than 5% margin after the card fee, so it wasn&apos;t applied.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-line bg-surface p-6 text-ink-2">No suggestions waiting.</p>
      ) : (
        <ul className="grid gap-4">
          {rows.map((s) => {
            const v = s.variants;
            const cost = v?.variant_costs ? Number(v.variant_costs.cost_price) : null;
            const now = Number(v?.price ?? s.current_price);
            const next = Number(s.suggested_price);
            const change = Math.round((next / now - 1) * 100);
            return (
              <li key={s.id} className="grid gap-3 rounded-2xl border-2 border-line bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/shop/${v?.products?.slug}`} target="_blank" className="font-bold underline">
                    {v?.products?.name} <span className="font-normal text-ink-2">· {v?.title}</span>
                  </Link>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${change > 0 ? "bg-ok-bg text-ok-fg" : "bg-warn-bg text-warn-fg"}`}
                  >
                    {change > 0 ? "+" : ""}
                    {change}%
                  </span>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div className="grid gap-0.5">
                    <span className="text-xs font-bold uppercase text-ink-2">Now</span>
                    <span className="text-lg font-extrabold tabular-nums">{formatMyr(now)}</span>
                    <Margin price={now} cost={cost} />
                  </div>
                  <div className="grid gap-0.5">
                    <span className="text-xs font-bold uppercase text-ink-2">Suggested</span>
                    <span className="text-lg font-extrabold tabular-nums">{formatMyr(next)}</span>
                    <Margin price={next} cost={cost} />
                  </div>
                  <div className="grid gap-0.5">
                    <span className="text-xs font-bold uppercase text-ink-2">Market</span>
                    <span className="text-lg font-extrabold tabular-nums">
                      {s.market_low != null && s.market_high != null
                        ? `${formatMyr(Number(s.market_low))} – ${formatMyr(Number(s.market_high))}`
                        : "—"}
                    </span>
                    <span className="text-ink-2">{s.sources.length} shops checked</span>
                  </div>
                </div>

                {s.reason && <p className="text-sm">{s.reason}</p>}
                {s.sources.length > 0 && (
                  <ul className="flex flex-wrap gap-2 text-xs">
                    {s.sources.map((src) => (
                      <li key={src.url}>
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-ground px-2.5 py-1 underline">
                          {src.name}: {formatMyr(Number(src.price))}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  {(["approve", "reject"] as const).map((d) => (
                    <form key={d} action={decidePriceSuggestion}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="decision" value={d} />
                      <button
                        type="submit"
                        className={`min-h-9 rounded-full px-4 text-sm font-semibold ${d === "approve" ? "bg-ok-bg text-ok-fg" : "bg-bad-bg text-bad-fg"}`}
                      >
                        {d === "approve" ? `Approve ${formatMyr(next)}` : "Keep current price"}
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
