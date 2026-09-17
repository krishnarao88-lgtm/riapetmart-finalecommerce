"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { addBatch, deleteBatch } from "@/app/admin/products/actions";

export type Batch = {
  id: string;
  quantity: number;
  expiry_date: string | null;
  batch_no: string | null;
  received_at: string;
};

const field = "min-h-11 w-full rounded-xl border-2 border-line bg-ground px-3 font-normal";

export function BatchEditor({
  variantId,
  productId,
  batches,
}: {
  variantId: string;
  productId: string;
  batches: Batch[];
}) {
  const [addState, addAction, adding] = useActionState(addBatch, null);
  const [delState, delAction] = useActionState(deleteBatch, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-3">
      {batches.length > 0 && (
        <ul className="grid gap-2">
          {batches.map((batch) => {
            const expired = batch.expiry_date !== null && batch.expiry_date < today;
            return (
              <li
                key={batch.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-line bg-ground px-3 py-2 text-sm"
              >
                <span className="font-semibold tabular-nums">{batch.quantity} in stock</span>
                <span className={`tabular-nums ${expired ? "font-semibold text-bad-fg" : "text-ink-2"}`}>
                  {batch.expiry_date ? `Best before ${batch.expiry_date}${expired ? " · expired" : ""}` : "No expiry date"}
                </span>
                {batch.batch_no && <span className="font-mono text-xs text-ink-3">{batch.batch_no}</span>}
                <form action={delAction} className="ml-auto">
                  <input type="hidden" name="batch_id" value={batch.id} />
                  <input type="hidden" name="product_id" value={productId} />
                  <button type="submit" className="inline-flex min-h-11 items-center gap-1 text-ink-2 hover:text-bad-fg">
                    <Trash2 className="size-4" aria-hidden /> Remove
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <form action={addAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="variant_id" value={variantId} />
        <input type="hidden" name="product_id" value={productId} />
        <label className="grid gap-1 text-sm font-semibold" htmlFor={`qty-${variantId}`}>
          Quantity
          <input id={`qty-${variantId}`} name="quantity" type="number" min="0" step="1" defaultValue={0} className={field} />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor={`exp-${variantId}`}>
          Best before
          <input id={`exp-${variantId}`} name="expiry_date" type="date" className={field} />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor={`batch-${variantId}`}>
          Batch no. (optional)
          <input id={`batch-${variantId}`} name="batch_no" className={field} />
        </label>
        <button type="submit" disabled={adding} className="btn-chunk bg-lagoon text-sm disabled:opacity-60">
          {adding ? "Adding…" : "Add stock"}
        </button>
      </form>

      {(addState?.error ?? delState?.error) && (
        <p role="alert" className="text-sm font-semibold text-bad-fg">
          {addState?.error ?? delState?.error}
        </p>
      )}
      {(addState?.ok ?? delState?.ok) && (
        <p role="status" className="text-sm font-semibold text-ok-fg">
          {addState?.ok ?? delState?.ok}
        </p>
      )}
    </div>
  );
}
