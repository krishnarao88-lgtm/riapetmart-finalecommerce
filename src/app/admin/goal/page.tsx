import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { goalPace, SALES_GOAL } from "@/lib/goal";
import { formatMyr } from "@/lib/pricing";

export const metadata: Metadata = { title: "Road to RM100k", robots: { index: false } };

const DAY = 86_400_000;

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "bad" | "ok" }) {
  const color = tone === "bad" ? "text-bad-fg" : tone === "ok" ? "text-ok-fg" : "text-ink";
  return (
    <div className="grid gap-0.5 rounded-2xl border-2 border-line bg-surface p-4">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-2">{label}</span>
      <span className={`text-xl font-extrabold tabular-nums ${color}`}>{value}</span>
      {note && <span className="text-xs text-ink-2">{note}</span>}
    </div>
  );
}

// The levers in order of RM they can add before 31 Dec (founder audit, 13 Oct 2026).
const LEVERS = [
  "Move walk-in and WhatsApp regulars to website delivery orders (counter card + QR, WhatsApp broadcast).",
  "Repeat orders: refill reminders and the welcome series are live; reply to every review request.",
  "11.11 and 12.12 sales: one hero bundle each, announced 7 days ahead to the list and Facebook groups.",
  "Meta ads to past buyers and site visitors first (retargeting), then lookalikes. Keep cost per order under RM27.",
  "Google Shopping and Search Console: GTINs on the top 30 sellers, request indexing for the top pages.",
];

export default async function GoalPage() {
  const { supabase } = await requireAdmin();
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const [{ data: orders }, { count: views }, { count: carts }] = await Promise.all([
    supabase.from("orders").select("total, refunded_amount, created_at").eq("status", "paid").eq("is_test", false).limit(20000),
    supabase.from("product_views").select("id", { count: "exact", head: true }).gte("viewed_at", since30),
    supabase.from("cart_adds").select("id", { count: "exact", head: true }).gte("created_at", since30),
  ]);
  const rows = (orders ?? []).map((o) => ({ total: Number(o.total), refunded: Number(o.refunded_amount ?? 0), created_at: o.created_at }));
  const p = goalPace(rows);
  const orders30 = rows.filter((o) => Date.now() - new Date(o.created_at).getTime() < 30 * DAY).length;
  const viewToOrder = views ? orders30 / views : 0;
  const viewsNeeded = viewToOrder && p.needOrdersPerDay ? Math.ceil(p.needOrdersPerDay / viewToOrder) : null;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  // Straight-line checkpoints from today to the goal, so each month-end has a number to beat.
  const now = Date.now();
  const checkpoints = ["2026-10-31", "2026-11-30", "2026-12-31"]
    .map((d) => ({ d, at: new Date(`${d}T23:59:59+08:00`).getTime() }))
    .filter((c) => c.at > now)
    .map((c) => ({ d: c.d, target: p.sold + p.needPerDay * Math.ceil((c.at - now) / DAY) }));

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-extrabold text-ink">Road to RM100k</h1>
        <p className="text-sm text-ink-2">{SALES_GOAL.label}. Paid website orders only, refunds taken off, test orders hidden.</p>
        <div className="h-4 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(p.pctDone * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to goal">
          <div className="h-full bg-rust" style={{ width: `${Math.max(1, p.pctDone * 100)}%` }} />
        </div>
        <p className="text-sm font-bold text-ink">
          {formatMyr(p.sold)} of {formatMyr(SALES_GOAL.target)} ({pct(p.pctDone)})
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile label="Still to go" value={formatMyr(p.remaining)} note={`${p.daysLeft} days left`} />
        <Tile
          label="Needed every day"
          value={formatMyr(p.needPerDay)}
          note={p.needOrdersPerDay ? `≈ ${p.needOrdersPerDay.toFixed(1)} orders a day at ${formatMyr(p.aov)} average` : "No orders yet"}
        />
        <Tile
          label="Last 7 days, per day"
          value={formatMyr(p.pacePerDay)}
          tone={p.pacePerDay >= p.needPerDay ? "ok" : "bad"}
          note={p.gap ? `Need ${p.gap.toFixed(1)}× this pace` : "No sales in the last 7 days"}
        />
        <Tile
          label="31 Dec at this pace"
          value={formatMyr(p.projected)}
          tone={p.projected >= SALES_GOAL.target ? "ok" : "bad"}
        />
        <Tile label="Average order" value={formatMyr(p.aov)} note={`${rows.length} paid orders`} />
        <Tile
          label="Product views needed a day"
          value={viewsNeeded ? viewsNeeded.toLocaleString() : "–"}
          note={`Last 30 days: ${((views ?? 0) / 30).toFixed(0)} a day, ${pct(viewToOrder)} became orders`}
        />
      </section>

      <section className="grid gap-2 rounded-2xl border-2 border-line bg-surface p-4">
        <h2 className="font-extrabold text-ink">Shop funnel, last 30 days</h2>
        <ul className="grid gap-1 text-sm tabular-nums">
          <li>Product views: {(views ?? 0).toLocaleString()}</li>
          <li>
            Added to cart: {carts ?? 0} ({pct(views ? (carts ?? 0) / views : 0)} of views)
          </li>
          <li>
            Paid orders: {orders30} ({pct(carts ? orders30 / carts : 0)} of carts)
          </li>
        </ul>
      </section>

      {checkpoints.length > 0 && (
        <section className="grid gap-2 rounded-2xl border-2 border-line bg-surface p-4">
          <h2 className="font-extrabold text-ink">Checkpoints to beat</h2>
          <ul className="grid gap-1 text-sm tabular-nums">
            {checkpoints.map((c) => (
              <li key={c.d}>
                By {c.d}: {formatMyr(c.target)} total
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-2 rounded-2xl border-2 border-line bg-surface p-4">
        <h2 className="font-extrabold text-ink">The five levers</h2>
        <ol className="list-decimal grid gap-1 pl-5 text-sm text-ink">
          {LEVERS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
