import type { orderProfit } from "@/lib/finance";
import { formatMyr } from "@/lib/pricing";

type Profit = ReturnType<typeof orderProfit>;

/** Admin-only money breakdown for one paid order: in, out, what's left. */
export function OrderProfit({ p }: { p: Profit }) {
  const rows: [string, number, string?][] = [
    ["Products sold", p.goods],
    ["Delivery the customer paid", p.deliveryCharged],
    ["Product cost", -p.productCost, p.costMissing ? `${p.costMissing} item(s) have no cost price in Admin` : undefined],
    ["Courier", -p.courier, p.courierEstimated ? "Not booked yet — assumed the same as the customer paid" : undefined],
    ["Card / FPX fee", -p.fee, "Estimate: 3% + RM1"],
  ];
  if (p.refunded) rows.push(["Refunded", -p.refunded]);
  const tone = p.profit < 0 ? "text-bad-fg" : "text-ok-fg";
  return (
    <details className="rounded-xl border border-line px-3 py-2 text-sm">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Profit</span>
        <span className={`font-bold tabular-nums ${tone}`}>
          {formatMyr(p.profit)}
          {p.deliveryCovered > 0 && <span className="ml-2 font-normal text-ink-2">(you covered {formatMyr(p.deliveryCovered)} delivery)</span>}
          {(p.courierEstimated || p.costMissing > 0) && <span className="ml-2 font-normal text-ink-2">· estimate</span>}
        </span>
      </summary>
      <ul className="mt-2 grid gap-1">
        {rows.map(([label, value, note]) => (
          <li key={label} className="flex justify-between gap-3">
            <span>
              {label}
              {note && <span className="block text-xs text-ink-2">{note}</span>}
            </span>
            <span className="tabular-nums">{value < 0 ? `− ${formatMyr(-value)}` : formatMyr(value)}</span>
          </li>
        ))}
        <li className={`flex justify-between gap-3 border-t border-line pt-1 font-bold ${tone}`}>
          <span>Your profit</span>
          <span className="tabular-nums">{formatMyr(p.profit)}</span>
        </li>
      </ul>
    </details>
  );
}
