"use client";

import { useActionState, useState } from "react";
import { bookEasyParcelShipment } from "@/app/admin/orders/actions";

export function BookEasyParcel({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(bookEasyParcelShipment, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-fit text-sm font-semibold text-grape underline">
        Book & print waybill (EasyParcel)
      </button>
    );
  }

  return (
    <form action={action} className="grid gap-2 rounded-xl border-2 border-line bg-ground p-3">
      <input type="hidden" name="order_id" value={orderId} />
      <p className="text-xs text-ink-2">
        This books the real courier and deducts from your EasyParcel balance — cannot be undone from here.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input name="receiver_name" placeholder="Receiver name" required className="min-h-11 rounded-xl border-2 border-line bg-surface px-3" />
        <input name="receiver_phone" placeholder="Receiver phone (e.g. 0123456789)" required className="min-h-11 rounded-xl border-2 border-line bg-surface px-3" />
        <button type="submit" disabled={pending} className="btn-chunk bg-tangerine text-sm disabled:opacity-60">
          {pending ? "Booking…" : "Confirm booking"}
        </button>
      </div>
      {state?.ok && <p className="text-sm font-semibold text-ok-fg">{state.ok}</p>}
      {state?.error && <p className="text-sm font-semibold text-bad-fg">{state.error}</p>}
    </form>
  );
}
