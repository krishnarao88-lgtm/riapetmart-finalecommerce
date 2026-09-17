"use client";

import { useActionState } from "react";
import { applyBulkMargin } from "@/app/admin/products/actions";

export function BulkMarginForm({ q, status, count }: { q: string; status: string; count: number }) {
  const [state, action, pending] = useActionState(applyBulkMargin, null);

  return (
    <form
      action={action}
      className="grid gap-3 rounded-[var(--radius-chunk)] border-2 border-line bg-surface p-4 sm:grid-cols-[auto_auto_1fr] sm:items-end"
    >
      <input type="hidden" name="q" value={q} />
      <input type="hidden" name="status" value={status} />
      <label className="grid gap-1 text-sm font-semibold" htmlFor="bulk_margin">
        Set margin for these {count} products
        <input
          id="bulk_margin"
          name="bulk_margin"
          type="number"
          min="0"
          max="94"
          step="1"
          placeholder="25"
          className="min-h-11 w-28 rounded-xl border-2 border-line bg-ground px-3 font-normal tabular-nums"
        />
      </label>
      <button type="submit" disabled={pending} className="btn-chunk bg-grape text-sm text-surface disabled:opacity-60">
        {pending ? "Repricing…" : "Apply margin"}
      </button>
      <p className="text-sm text-ink-2">
        {state?.error ? (
          <span role="alert" className="font-semibold text-bad-fg">
            {state.error}
          </span>
        ) : state?.ok ? (
          <span role="status" className="font-semibold text-ok-fg">
            {state.ok}
          </span>
        ) : (
          "Only variants that already have a cost price are repriced. Prices round up to the next 10 sen."
        )}
      </p>
    </form>
  );
}
