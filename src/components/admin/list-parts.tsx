import type { LucideIcon } from "lucide-react";

/** Page title row used by the admin list pages (customers, reviews, cat hotel, counter card). */
export function PageHeader({ title, sub, action, className = "" }: { title: string; sub: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="grid max-w-[65ch] gap-0.5">
        <h1 className="font-bubble text-3xl font-extrabold text-choc">{title}</h1>
        <p className="text-sm text-ink-2">{sub}</p>
      </div>
      {action}
    </div>
  );
}

/** Non-link count tile: icon chip, big number, label, small note. Same look as the Orders stat row. */
export function CountTile({ label, value, note, Icon, chip }: { label: string; value: string | number; note?: string; Icon: LucideIcon; chip: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-chunk)]">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${chip}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="grid min-w-0">
        <span className="font-bubble text-2xl font-extrabold leading-none tabular-nums text-choc">{value}</span>
        <span className="text-sm font-semibold text-ink-2">{label}</span>
        {note && <span className="text-xs text-ink-3">{note}</span>}
      </span>
    </li>
  );
}

export const TONE = {
  ok: "bg-ok-bg text-ok-fg",
  warn: "bg-warn-bg text-warn-fg",
  bad: "bg-bad-bg text-bad-fg",
  muted: "bg-sunk text-ink-2",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${TONE[tone]}`}>{children}</span>
  );
}

export function EmptyState({ Icon, children }: { Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-peach/50 text-rust">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-ink-2">{children}</p>
    </div>
  );
}

/** Small action button used on review and booking cards so every approve/decline row looks the same. */
export const actionBtn = {
  yes: "btn-chunk min-h-10 bg-ok-fg px-4 text-sm text-white",
  no: "btn-chunk min-h-10 bg-surface px-4 text-sm text-bad-fg",
  quiet: "btn-chunk min-h-10 bg-surface px-4 text-sm text-ink-2",
} as const;
