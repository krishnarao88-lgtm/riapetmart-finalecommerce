import type { LucideIcon } from "lucide-react";
import Link from "next/link";

/** Pill link used for period switchers, filters and pagination (matches the dashboard toggles). */
export function PillLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-9 items-center rounded-full px-3 text-sm font-semibold transition-colors ${
        active ? "bg-choc text-cream" : "bg-sunk text-ink-2 hover:bg-peach/50"
      }`}
    >
      {children}
    </Link>
  );
}

const TONE = { ok: "text-ok-fg", bad: "text-bad-fg" } as const;

/** Stat card for a single figure: icon chip, big value, label and an optional note. */
export function FigureCard({
  label,
  value,
  note,
  Icon,
  chip = "bg-peach/60 text-rust",
  tone,
  compact = false,
}: {
  label: string;
  value: string;
  note?: string;
  Icon?: LucideIcon;
  chip?: string;
  tone?: "ok" | "bad";
  compact?: boolean;
}) {
  return (
    <li className={`grid content-start gap-3 rounded-2xl border border-line bg-surface shadow-[var(--shadow-chunk)] ${compact ? "p-4" : "p-5"}`}>
      {Icon && (
        <span className={`grid size-11 place-items-center rounded-xl ${chip}`}>
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <div className="grid gap-0.5">
        <span className={`font-bubble font-extrabold tabular-nums ${compact ? "text-xl" : "text-3xl"} ${tone ? TONE[tone] : "text-choc"}`}>{value}</span>
        <span className="text-sm font-semibold text-ink-2">{label}</span>
        {note && <span className="text-xs text-ink-3">{note}</span>}
      </div>
    </li>
  );
}

/** Horizontal bar with a label, count and percentage. */
export function FunnelBar({ label, value, share, note }: { label: string; value: string; share: number; note?: string }) {
  return (
    <li className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="font-semibold text-choc">{label}</span>
        <span className="tabular-nums text-ink-3">
          <span className="font-bold text-choc">{value}</span>
          {note && ` · ${note}`}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-sunk" aria-hidden>
        <div
          className="h-full rounded-full bg-linear-to-r from-terracotta to-rust"
          style={{ width: `${share > 0 ? Math.max(2, Math.min(100, share * 100)) : 0}%` }}
        />
      </div>
    </li>
  );
}
