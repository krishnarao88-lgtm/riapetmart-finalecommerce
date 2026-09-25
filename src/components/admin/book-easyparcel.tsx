"use client";

import { useActionState, useState } from "react";
import { bookEasyParcelShipment, bookLalamoveRider } from "@/app/admin/orders/actions";

export function BookEasyParcel({
  orderId,
  defaultName = "",
  defaultPhone = "",
  carrier = "easyparcel",
}: {
  orderId: string;
  defaultName?: string;
  defaultPhone?: string;
  carrier?: "easyparcel" | "lalamove";
}) {
  const lalamove = carrier === "lalamove";
  const [state, action, pending] = useActionState(lalamove ? bookLalamoveRider : bookEasyParcelShipment, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-fit text-sm font-semibold text-grape underline">
        {lalamove ? "Book Lalamove rider" : "Book & print waybill (EasyParcel)"}
      </button>
    );
  }

  const generating = !lalamove && state?.error?.toLowerCase().includes("being generated");

  return (
    <form action={action} className="grid gap-2 rounded-xl border-2 border-line bg-ground p-3">
      <input type="hidden" name="order_id" value={orderId} />
      <p className="text-xs text-ink-2">
        {lalamove
          ? "This books a Lalamove rider to collect from the shop now and charges your Lalamove wallet. The customer is emailed a live tracking link."
          : "This books the real courier and deducts from your EasyParcel balance — cannot be undone from here."} Prefilled
        from what the customer entered at checkout; edit if it&apos;s missing or wrong.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          name="receiver_name"
          defaultValue={defaultName}
          placeholder="Receiver name"
          required
          className="min-h-11 min-w-0 rounded-xl border-2 border-line bg-surface px-3"
        />
        <input
          name="receiver_phone"
          defaultValue={defaultPhone}
          placeholder="Receiver phone (e.g. 0123456789)"
          required
          className="min-h-11 min-w-0 rounded-xl border-2 border-line bg-surface px-3"
        />
        <button type="submit" disabled={pending} className="btn-chunk bg-tangerine text-sm disabled:opacity-60">
          {pending ? "Booking…" : "Confirm booking"}
        </button>
      </div>
      {state?.ok && <p className="text-sm font-semibold text-ok-fg">{state.ok}</p>}
      {state?.error && generating && (
        <p className="text-sm font-semibold text-warn-fg">
          EasyParcel accepted the booking and is still generating the label. Check EasyParcel&apos;s own dashboard or
          this order again in a minute — don&apos;t click Confirm booking again, that would book a second shipment.
        </p>
      )}
      {state?.error && !generating && <p className="text-sm font-semibold text-bad-fg">{state.error}</p>}
    </form>
  );
}
