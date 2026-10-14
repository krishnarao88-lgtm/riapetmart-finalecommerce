import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { formatMyr } from "@/lib/pricing";

/** "+12.5%" style change pill. `null` means there was nothing to compare against. */
export function Delta({ value, unit = "%", onDark = false }: { value: number | null; unit?: string; onDark?: boolean }) {
  const Icon = value != null && value < 0 ? TrendingDown : TrendingUp;
  const tone = onDark
    ? "bg-white/15 text-cream"
    : value == null || value === 0
      ? "bg-sunk text-ink-2"
      : value > 0
        ? "bg-ok-bg text-ok-fg"
        : "bg-bad-bg text-bad-fg";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${tone}`}>
      {value == null ? (
        "new"
      ) : (
        <>
          <Icon className="size-3.5" aria-hidden />
          {value > 0 ? "+" : ""}
          {value}
          {unit}
        </>
      )}
    </span>
  );
}

/** Glassy KPI tile inside the welcome hero. */
export function HeroTile({ label, value, delta, unit, compare }: { label: string; value: string; delta: number | null; unit?: string; compare: string }) {
  return (
    <li className="grid content-start gap-1 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <span className="text-xs font-semibold text-cream/85">{label}</span>
      <span className="font-bubble text-2xl font-extrabold tabular-nums text-white">{value}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-cream/85">
        <Delta value={delta} unit={unit} onDark /> {compare}
      </span>
    </li>
  );
}

/** White stat card: icon chip, change pill, big number, and a bar of this month against all of last month. */
export function StatCard({
  label,
  value,
  Icon,
  chip,
  delta,
  current,
  last,
  format = String,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
  chip: string;
  delta: number | null;
  current: number;
  last: number;
  format?: (n: number) => string;
}) {
  const ratio = last > 0 ? Math.max(0, current / last) : null;
  return (
    <li className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-chunk)]">
      <div className="flex items-start justify-between gap-2">
        <span className={`grid size-11 place-items-center rounded-xl ${chip}`}>
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="grid justify-items-end gap-0.5">
          <Delta value={delta} />
          <span className="text-[11px] text-ink-3">vs same day last month</span>
        </span>
      </div>
      <div className="grid gap-0.5">
        <span className="font-bubble text-3xl font-extrabold tabular-nums text-choc">{value}</span>
        <span className="text-sm font-semibold text-ink-2">{label}</span>
      </div>
      {ratio == null ? (
        <p className="text-xs text-ink-3">Nothing last month to compare with.</p>
      ) : (
        <div className="grid gap-1.5">
          <div
            className="h-2 overflow-hidden rounded-full bg-sunk"
            role="progressbar"
            aria-label={`${label}: share of last month's total`}
            aria-valuenow={Math.round(ratio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-terracotta" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
          </div>
          <div className="flex flex-wrap justify-between gap-x-2 text-xs text-ink-3">
            <span className="font-semibold tabular-nums text-ink-2">{Math.round(ratio * 100)}% of last month</span>
            <span className="tabular-nums">Last month: {format(last)}</span>
          </div>
        </div>
      )}
    </li>
  );
}

export function Panel({
  title,
  Icon,
  action,
  id,
  children,
}: {
  title: string;
  Icon: LucideIcon;
  action?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className="grid content-start gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-chunk)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id ? `${id}-h` : undefined} className="flex items-center gap-2 font-bubble text-lg font-extrabold text-choc">
          <span className="grid size-8 place-items-center rounded-lg bg-peach/50 text-rust">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

type MonthRow = { month: string; revenue: number; orders: number; growth: number | null };

const monthName = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-MY", { month: "short", year: "numeric", timeZone: "UTC" });

/** Horizontal revenue bar per month: label, order count, growth vs the month before, amount. */
export function RevenueBars({ rows }: { rows: MonthRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.month} className="grid gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-choc">
              {monthName(r.month)} <span className="font-normal text-ink-3">· {r.orders} orders</span>
            </span>
            <span className="flex items-center gap-2">
              <Delta value={r.growth} />
              <span className="font-bold tabular-nums text-choc">{formatMyr(r.revenue)}</span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-sunk" aria-hidden>
            <div
              className="h-full rounded-full bg-linear-to-r from-terracotta to-rust"
              style={{ width: `${r.revenue ? Math.max(2, (r.revenue / max) * 100) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 rounded-xl bg-cream p-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{label}</span>
      <span className="font-bubble text-lg font-extrabold tabular-nums text-choc">{value}</span>
    </div>
  );
}

/** Coloured "waiting on you" card with a count and one button. */
export function PendingCard({ label, count, note, href, cta, tone }: { label: string; count: number; note: string; href: string; cta: string; tone: string }) {
  return (
    <li className={`grid content-between gap-3 rounded-2xl p-5 ${tone}`}>
      <div className="grid gap-0.5">
        <span className="text-sm font-bold">{label}</span>
        <span className="font-bubble text-4xl font-extrabold tabular-nums">{count}</span>
        <span className="text-xs">{note}</span>
      </div>
      <Link href={href} className="btn-bubble min-h-10 justify-self-start bg-surface px-4 text-sm text-choc">
        {cta}
      </Link>
    </li>
  );
}
