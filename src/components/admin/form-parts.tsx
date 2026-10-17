import { CheckCircle2, XCircle } from "lucide-react";

/* Shared look for the admin catalogue, settings and account screens (stage 4 restyle).
   Matches the dashboard and orders pages: choc primary, white bordered secondary, rose danger. */

export const pageWrap = "mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6";
export const btnPrimary = "btn-chunk bg-choc px-5 text-sm text-cream disabled:opacity-60";
export const btnSecondary = "btn-chunk bg-surface px-4 text-sm text-choc disabled:opacity-60";
export const btnDanger = "btn-chunk bg-bad-bg px-4 text-sm text-bad-fg disabled:opacity-60";
/** Label above input: wrap a label in this, put the input inside or after it. */
export const labelCls = "grid content-start gap-1.5 text-sm font-semibold text-choc";
export const inputCls =
  "min-h-11 w-full rounded-xl border border-line bg-ground px-3 text-sm font-normal text-ink tabular-nums placeholder:text-ink-3";
export const checkCls = "flex items-center gap-3 rounded-xl bg-cream/60 px-3 py-2.5 text-sm font-semibold text-choc";
export const hintCls = "text-xs font-normal text-ink-3";
export const pillCls = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold";

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-0.5">
        <h1 className="font-bubble text-3xl font-extrabold text-choc">{title}</h1>
        {description && <p className="text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Success / error banner. Errors are announced immediately, successes politely. */
export function Notice({ tone, children }: { tone: "ok" | "bad"; children: React.ReactNode }) {
  const Icon = tone === "ok" ? CheckCircle2 : XCircle;
  return (
    <p
      role={tone === "bad" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${tone === "ok" ? "bg-ok-bg text-ok-fg" : "bg-bad-bg text-bad-fg"}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

const STATUS_TONE: Record<string, string> = {
  published: "bg-ok-bg text-ok-fg",
  draft: "bg-warn-bg text-warn-fg",
  archived: "bg-sunk text-ink-2",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`${pillCls} capitalize ${STATUS_TONE[status] ?? "bg-sunk text-ink-2"}`}>{status}</span>;
}
