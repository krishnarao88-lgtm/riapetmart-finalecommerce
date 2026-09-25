"use client";

import { useActionState } from "react";
import { saveBundleOffer } from "@/app/admin/promotions/actions";

export type BundleOfferRowData = {
  productId: string;
  name: string;
  priceLabel: string;
  costLabel: string;
  percent: number;
  approved: boolean;
  /** Lowest margin across sizes at the current % (null when a cost price is missing). */
  marginAfter: number | null;
};

export function BundleOfferRow({ row, floor }: { row: BundleOfferRowData; floor: number }) {
  const [state, action, pending] = useActionState(saveBundleOffer, null);
  const tooThin = row.marginAfter !== null && row.marginAfter < floor;

  return (
    <tr className="border-b border-line align-top last:border-0">
      <td className="p-3 font-semibold">{row.name}</td>
      <td className="p-3 tabular-nums">{row.priceLabel}</td>
      <td className="p-3 tabular-nums">{row.costLabel}</td>
      <td className="p-3">
        <form action={action} className="grid gap-2">
          <input type="hidden" name="product_id" value={row.productId} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="number"
                name="percent"
                min={1}
                max={50}
                step={0.5}
                defaultValue={row.percent}
                aria-label={`Bundle discount for ${row.name}`}
                className="min-h-10 w-20 rounded-lg border-2 border-line bg-ground px-2 tabular-nums"
              />
              % off
            </label>
            <button
              type="submit"
              name="intent"
              value="approve"
              disabled={pending}
              className="btn-chunk bg-ok-bg text-sm text-ok-fg disabled:opacity-60"
            >
              Approve
            </button>
            {row.approved && (
              <button type="submit" name="intent" value="withdraw" disabled={pending} className="text-sm font-semibold underline">
                Withdraw
              </button>
            )}
          </div>
          {state?.error && (
            <p role="alert" className="text-sm font-semibold text-bad-fg">
              {state.error}
            </p>
          )}
          {state?.ok && <p className="text-sm font-semibold text-ok-fg">{state.ok}</p>}
        </form>
      </td>
      <td className="p-3 tabular-nums">
        {row.marginAfter === null ? (
          <span className="text-warn-fg">Set cost</span>
        ) : (
          <span className={tooThin ? "font-bold text-bad-fg" : "text-ok-fg"}>{Math.round(row.marginAfter * 100)}%</span>
        )}
      </td>
      <td className="p-3">
        {row.approved ? (
          <span className="rounded-full bg-ok-bg px-2 py-0.5 text-xs font-bold text-ok-fg">Live</span>
        ) : (
          <span className="rounded-full bg-sunk px-2 py-0.5 text-xs font-bold">Pending</span>
        )}
      </td>
    </tr>
  );
}
