import { ChevronDown } from "lucide-react";
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
  const bad = p.profit < 0;
  const tone = bad ? "text-bad-fg" : "text-ok-fg";
  return (
    <details className="group rounded-xl border border-line bg-surface text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-cream [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5 font-semibold text-choc">
          <ChevronDown className="size-4 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
          Profit
        </span>
        <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
          {p.deliveryCovered > 0 && <span className="text-xs text-ink-3">(you covered {formatMyr(p.deliveryCovered)} delivery)</span>}
          {(p.courierEstimated || p.feeEstimated || p.costMissing > 0) && (
            <span className="rounded-full bg-warn-bg px-2 py-0.5 text-xs font-semibold text-warn-fg">estimate</span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 font-bold tabular-nums ${bad ? "bg-bad-bg text-bad-fg" : "bg-ok-bg text-ok-fg"}`}>
            {formatMyr(p.profit)}
          </span>
        </span>
      </summary>
      <ul className="grid gap-2 border-t border-line px-3 py-3">
        {rows.map(([label, value, cost, note]) => (
          <li key={label} className="flex justify-between gap-3">
            <span className="text-ink">
              {label}
              {note && <span className="block text-xs text-ink-3">{note}</span>}
            </span>
            <span className={`shrink-0 tabular-nums ${cost && value > 0 ? "text-ink-2" : "text-choc"}`}>
              {cost && value > 0 ? `− ${formatMyr(value)}` : formatMyr(value)}
            </span>
          </li>
        ))}
        <li className={`flex justify-between gap-3 border-t border-line pt-2 font-bold ${tone}`}>
          <span>Your profit</span>
          <span className="tabular-nums">{formatMyr(p.profit)}</span>
        </li>
      </ul>
      {booked && p.courierEstimated && (
        <form action={setCourierCost} className="flex flex-wrap items-end gap-2 border-t border-line px-3 py-3">
          <input type="hidden" name="order_id" value={orderId} />
          <label className="grid gap-1 text-xs font-semibold text-ink-2">
            Courier cost (RM, from your EasyParcel / Lalamove bill)
            <input
              name="courier_cost"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="min-h-10 w-32 rounded-xl border border-line bg-ground px-3 text-sm font-normal text-ink"
            />
          </label>
          <button type="submit" className="btn-chunk min-h-10 bg-choc px-4 text-sm text-cream">Save</button>
        </form>
      )}
    </details>
  );
}
