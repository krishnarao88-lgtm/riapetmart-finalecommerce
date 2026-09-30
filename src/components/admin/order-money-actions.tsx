"use client";

import { useActionState, useState } from "react";
import { cancelCourierBooking, refundOrder } from "@/app/admin/orders/money-actions";
import { formatMyr } from "@/lib/pricing";

/** Admin → Orders: refund through Stripe and cancel the EasyParcel booking, each behind a confirm step. */
export function OrderMoneyActions({
  orderId,
  orderNumber,
  refundable,
  canCancelCourier,
}: {
  orderId: string;
  orderNumber: string;
  refundable: number;
  canCancelCourier: boolean;
}) {
  const [refundState, refund, refunding] = useActionState(refundOrder, null);
  const [cancelState, cancel, cancelling] = useActionState(cancelCourierBooking, null);
  const [open, setOpen] = useState<"refund" | "cancel" | null>(null);
  if (refundable <= 0 && !canCancelCourier) return null;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-3 text-sm font-semibold">
        {refundable > 0 && (
          <button type="button" onClick={() => setOpen(open === "refund" ? null : "refund")} className="text-bad-fg underline">
            Refund…
          </button>
        )}
        {canCancelCourier && (
          <button type="button" onClick={() => setOpen(open === "cancel" ? null : "cancel")} className="text-bad-fg underline">
            Cancel courier booking…
          </button>
        )}
      </div>

      {open === "refund" && (
        <form
          action={refund}
          onSubmit={(e) => {
            const typed = new FormData(e.currentTarget).get("amount");
            if (!confirm(`Refund ${typed ? `RM ${typed}` : formatMyr(refundable)} for ${orderNumber} through Stripe? This can't be undone.`)) e.preventDefault();
          }}
          className="grid gap-2 rounded-xl border-2 border-bad-fg/40 bg-bad-bg/40 p-3"
        >
          <input type="hidden" name="order_id" value={orderId} />
          <p className="text-xs text-ink-2">
            Sends the money back to the customer&apos;s card or bank through Stripe. Leave the amount empty to refund
            everything left ({formatMyr(refundable)}).
          </p>
          <div className="flex flex-wrap gap-2">
            <input name="amount" type="number" min="0.01" max={refundable} step="0.01" placeholder={`Amount (max ${refundable.toFixed(2)})`} className="min-h-11 w-48 rounded-xl border-2 border-line bg-surface px-3" />
            <button type="submit" disabled={refunding} className="btn-chunk bg-bad-fg px-4 text-sm text-cream disabled:opacity-60">
              {refunding ? "Refunding…" : "Refund with Stripe"}
            </button>
          </div>
          {refundState?.ok && <p className="text-sm font-semibold text-ok-fg">{refundState.ok}</p>}
          {refundState?.error && <p className="text-sm font-semibold text-bad-fg">{refundState.error}</p>}
        </form>
      )}

      {open === "cancel" && (
        <form
          action={cancel}
          onSubmit={(e) => {
            if (!confirm(`Cancel the EasyParcel courier booking for ${orderNumber}?`)) e.preventDefault();
          }}
          className="grid gap-2 rounded-xl border-2 border-bad-fg/40 bg-bad-bg/40 p-3"
        >
          <input type="hidden" name="order_id" value={orderId} />
          <p className="text-xs text-ink-2">
            Only works before the courier collects the parcel. EasyParcel puts the shipping charge back in your
            EasyParcel wallet. The customer&apos;s payment isn&apos;t refunded; use Refund for that.
          </p>
          <div className="flex flex-wrap gap-2">
            <input name="remark" placeholder="Reason (e.g. customer changed address)" className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-surface px-3" />
            <button type="submit" disabled={cancelling} className="btn-chunk bg-bad-fg px-4 text-sm text-cream disabled:opacity-60">
              {cancelling ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>
          {cancelState?.ok && <p className="text-sm font-semibold text-ok-fg">{cancelState.ok}</p>}
          {cancelState?.error && <p className="text-sm font-semibold text-bad-fg">{cancelState.error}</p>}
        </form>
      )}
    </div>
  );
}
