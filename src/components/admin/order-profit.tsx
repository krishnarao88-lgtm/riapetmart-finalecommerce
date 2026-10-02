import { setCourierCost } from "@/app/admin/orders/actions";
import type { orderProfit } from "@/lib/finance";
import { formatMyr } from "@/lib/pricing";

type Profit = ReturnType<typeof orderProfit>;

/** Admin-only money breakdown for one paid order: in, out, what's left. */
export function OrderProfit({ orderId, p, booked }: { orderId: string; p: Profit; booked: boolean }) {
  const courierNote = !p.courierEstimated
    ? p.courier > 0 ? "Actual charge from the courier" : undefined
    : booked
      ? "Courier charge not fetched yet — it fills in automatically, or type it below"
      : "Not booked yet — assumed the same as the customer paid";
  // [label, amount, is a cost, note]
  const rows: [string, number, boolean, string?][] = [
    ["Products sold", p.goods, false],
    ["Delivery the customer paid", p.deliveryCharged, false],
    ["Product cost", p.productCost, true, p.costMissing ? `${p.costMissing} item(s) have no cost price in Admin` : undefined],
    ["Courier", p.courier, true, courierNote],
    ["Payment fee", p.fee, true, p.feeEstimated ? "Estimate 3% + RM1 — Stripe's real fee fills in once the payment settles" : "Actual fee from Stripe"],
  ];
  if (p.refunded) rows.push(["Refunded", p.refunded, true]);
  const tone = p.profit < 0 ? "text-bad-fg" : "text-ok-fg";
  return (
    <details className="rounded-xl border border-line px-3 py-2 text-sm">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Profit</span>
        <span className={`font-bold tabular-nums ${tone}`}>
          {formatMyr(p.profit)}
          {p.deliveryCovered > 0 && <span className="ml-2 font-normal text-ink-2">(you covered {formatMyr(p.deliveryCovered)} delivery)</span>}
          {(p.courierEstimated || p.feeEstimated || p.costMissing > 0) && <span className="ml-2 font-normal text-ink-2">· estimate</span>}
        </span>
      </summary>
      <ul className="mt-2 grid gap-1">
        {rows.map(([label, value, cost, note]) => (
          <li key={label} className="flex justify-between gap-3">
            <span>
              {label}
              {note && <span className="block text-xs text-ink-2">{note}</span>}
            </span>
            <span className="tabular-nums">{cost && value > 0 ? `− ${formatMyr(value)}` : formatMyr(value)}</span>
          </li>
        ))}
        <li className={`flex justify-between gap-3 border-t border-line pt-1 font-bold ${tone}`}>
          <span>Your profit</span>
          <span className="tabular-nums">{formatMyr(p.profit)}</span>
        </li>
      </ul>
      {booked && p.courierEstimated && (
        <form action={setCourierCost} className="mt-2 flex flex-wrap items-end gap-2 border-t border-line pt-2">
          <input type="hidden" name="order_id" value={orderId} />
          <label className="grid gap-1 text-xs text-ink-2">
            Courier cost (RM, from your EasyParcel / Lalamove bill)
            <input
              name="courier_cost"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="w-32 rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink"
            />
          </label>
          <button type="submit" className="btn-chunk bg-surface px-3 py-1 text-sm">Save</button>
        </form>
      )}
    </details>
  );
}
