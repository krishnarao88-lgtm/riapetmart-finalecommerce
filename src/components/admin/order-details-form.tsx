"use client";

import { useActionState } from "react";
import { updateShippingDetails } from "@/app/admin/orders/actions";
import { MY_STATES } from "@/lib/my-states";

type Address = { addressLine: string; city: string; postcode: string; state: string } | null;

/** Admin → Orders: change the customer's name, phone or address (e.g. asked on WhatsApp); rebooks a booked courier. */
export function OrderDetailsForm({
  orderId,
  name,
  phone,
  address,
  pickup,
  courierBooked,
}: {
  orderId: string;
  name: string;
  phone: string;
  address: Address;
  pickup: boolean;
  courierBooked: boolean;
}) {
  const [state, action, pending] = useActionState(updateShippingDetails, null);
  const field = "min-h-11 min-w-0 rounded-xl border-2 border-line bg-surface px-3 text-sm";
  return (
    <details className="rounded-xl border border-line px-3 py-2 text-sm">
      <summary className="cursor-pointer font-semibold">Change address or contact details</summary>
      <form
        action={action}
        onSubmit={(e) => {
          if (courierBooked && !confirm("A courier is already booked. Saving will cancel that booking and book a new one to the new address. Continue?")) {
            e.preventDefault();
          }
        }}
        className="mt-2 grid gap-2"
      >
        <input type="hidden" name="order_id" value={orderId} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="customer_name" defaultValue={name} placeholder="Name" required className={field} />
          <input name="customer_phone" defaultValue={phone} placeholder="Phone" required className={field} />
        </div>
        {!pickup && (
          <>
            <input name="address_line" defaultValue={address?.addressLine ?? ""} placeholder="Address" required className={field} />
            <div className="grid gap-2 sm:grid-cols-3">
              <input name="city" defaultValue={address?.city ?? ""} placeholder="City" className={field} />
              <input name="postcode" defaultValue={address?.postcode ?? ""} placeholder="Postcode" inputMode="numeric" pattern="\d{5}" required className={field} />
              <select name="state" defaultValue={address?.state ?? ""} required className={field}>
                <option value="" disabled>State</option>
                {MY_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {courierBooked && (
          <p className="text-xs text-warn-fg">
            The courier is already booked: saving cancels it and books again with the new details (only before pickup).
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-chunk w-fit bg-tangerine px-4 py-1.5 text-sm disabled:opacity-60">
          {pending ? "Saving…" : courierBooked ? "Save and rebook courier" : "Save"}
        </button>
        {state?.ok && <p className="font-semibold text-ok-fg">{state.ok}</p>}
        {state?.error && <p className="font-semibold text-bad-fg">{state.error}</p>}
      </form>
    </details>
  );
}
