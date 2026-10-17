import { CalendarCheck, Eye, Filter, Flag, Gauge, ListOrdered, ShoppingBag, Target, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { Panel } from "@/components/admin/dashboard-parts";
import { FigureCard, FunnelBar } from "@/components/admin/finance-parts";
import { requireAdmin } from "@/lib/auth";
import { goalPace, SALES_GOAL } from "@/lib/goal";
import { formatMyr } from "@/lib/pricing";

export const metadata: Metadata = { title: "Road to RM100k", robots: { index: false } };

const DAY = 86_400_000;

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

  const onPace = p.pacePerDay >= p.needPerDay;
  const onTarget = p.projected >= SALES_GOAL.target;

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6">
      <section aria-labelledby="goal-h" className="relative overflow-hidden rounded-3xl bg-linear-to-br from-choc via-choc-2 to-rust p-5 text-cream shadow-[var(--shadow-chunk)] sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-peach/20 blur-2xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-terracotta/25 blur-3xl" />
        <div className="relative grid gap-4">
          <div className="grid gap-1">
            <h1 id="goal-h" className="font-bubble text-3xl font-extrabold text-white">Road to RM100k</h1>
            <p className="text-sm text-cream/85">{SALES_GOAL.label}. Paid website orders only, refunds taken off, test orders hidden.</p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <p className="font-bubble text-3xl font-extrabold tabular-nums text-white sm:text-4xl">
              {formatMyr(p.sold)} <span className="text-lg font-bold text-cream/85">of {formatMyr(SALES_GOAL.target)}</span>
            </p>
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold tabular-nums text-cream">{pct(p.pctDone)}</span>
          </div>
          <div
            className="h-4 overflow-hidden rounded-full bg-white/15"
            role="progressbar"
            aria-valuenow={Math.round(p.pctDone * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress to goal"
          >
            <div className="h-full rounded-full bg-linear-to-r from-peach to-terracotta" style={{ width: `${Math.max(1, p.pctDone * 100)}%` }} />
          </div>
        </div>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FigureCard label="Still to go" value={formatMyr(p.remaining)} note={`${p.daysLeft} days left`} Icon={Flag} />
        <FigureCard
          label="Needed every day"
          value={formatMyr(p.needPerDay)}
          note={p.needOrdersPerDay ? `≈ ${p.needOrdersPerDay.toFixed(1)} orders a day at ${formatMyr(p.aov)} average` : "No orders yet"}
          Icon={Target}
          chip="bg-sunk text-terracotta-deep"
        />
        <FigureCard
          label="Last 7 days, per day"
          value={formatMyr(p.pacePerDay)}
          tone={onPace ? "ok" : "bad"}
          note={p.gap ? `Need ${p.gap.toFixed(1)}× this pace` : "No sales in the last 7 days"}
          Icon={Gauge}
          chip={onPace ? "bg-ok-bg text-ok-fg" : "bg-bad-bg text-bad-fg"}
        />
        <FigureCard
          label="31 Dec at this pace"
          value={formatMyr(p.projected)}
          tone={onTarget ? "ok" : "bad"}
          Icon={TrendingUp}
          chip={onTarget ? "bg-ok-bg text-ok-fg" : "bg-bad-bg text-bad-fg"}
        />
        <FigureCard label="Average order" value={formatMyr(p.aov)} note={`${rows.length} paid orders`} Icon={ShoppingBag} chip="bg-warn-bg text-warn-fg" />
        <FigureCard
          label="Product views needed a day"
          value={viewsNeeded ? viewsNeeded.toLocaleString() : "–"}
          note={`Last 30 days: ${((views ?? 0) / 30).toFixed(0)} a day, ${pct(viewToOrder)} became orders`}
          Icon={Eye}
        />
      </ul>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Shop funnel, last 30 days" Icon={Filter}>
          <ul className="grid gap-4">
            <FunnelBar label="Product views" value={(views ?? 0).toLocaleString()} share={views ? 1 : 0} />
            <FunnelBar
              label="Added to cart"
              value={String(carts ?? 0)}
              share={views ? (carts ?? 0) / views : 0}
              note={`${pct(views ? (carts ?? 0) / views : 0)} of views`}
            />
            <FunnelBar
              label="Paid orders"
              value={String(orders30)}
              share={views ? orders30 / views : 0}
              note={`${pct(carts ? orders30 / carts : 0)} of carts`}
            />
          </ul>
        </Panel>

        {checkpoints.length > 0 && (
          <Panel title="Checkpoints to beat" Icon={CalendarCheck}>
            <ul className="grid gap-3">
              {checkpoints.map((c) => {
                const d = new Date(`${c.d}T12:00:00+08:00`);
                const fmt = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur", ...o });
                return (
                  <li key={c.d} className="flex items-center gap-3 rounded-xl bg-cream p-3">
                    <time dateTime={c.d} className="grid w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-surface text-center">
                      <span className="bg-rust py-0.5 text-[11px] font-bold uppercase text-cream">{fmt({ month: "short" })}</span>
                      <span className="py-1 font-bubble text-xl font-extrabold text-choc">{fmt({ day: "numeric" })}</span>
                    </time>
                    <span className="grid min-w-0">
                      <span className="text-sm text-ink-2">By {c.d}</span>
                      <span className="font-bubble text-lg font-extrabold tabular-nums text-choc">{formatMyr(c.target)} total</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>

      <Panel title="The five levers" Icon={ListOrdered}>
        <ol className="grid gap-3">
          {LEVERS.map((l, i) => (
            <li key={l} className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-peach/60 text-xs font-bold text-rust">{i + 1}</span>
              <span className="pt-0.5 text-sm text-ink">{l}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
