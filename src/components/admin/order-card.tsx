import { ChevronDown, ExternalLink, MapPin, Package, Printer, Store, Truck, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { setFulfilmentStatus, type FulfilmentStatus } from "@/app/admin/orders/actions";
import { BookEasyParcel } from "@/components/admin/book-easyparcel";
import { OrderDetailsForm } from "@/components/admin/order-details-form";
import { OrderMoneyActions } from "@/components/admin/order-money-actions";
import { type Attribution, sourceLabel } from "@/lib/attribution";
import { formatMyr } from "@/lib/pricing";
import { isSandboxAwb } from "@/lib/shipping/easyparcel";
import { EP_CANCELLED, EP_PROBLEM, EP_STATUS } from "@/lib/shipping/easyparcel-status";
import { LALAMOVE_REBOOKABLE } from "@/lib/shipping/lalamove-rules";

type OrderItem = { variant_id: string; name: string; title: string; qty: number; price: number };
type ShippingAddress = { addressLine: string; city: string; postcode: string; state: string } | null;
export type Order = {
  id: string;
  order_number: string | null;
  created_at: string;
  status: "pending" | "paid" | "failed";
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  fulfilment_status: FulfilmentStatus;
  items: OrderItem[];
  shipping_method: string | null;
  shipping_address: ShippingAddress;
  easyparcel_order_number: string | null;
  easyparcel_awb_number: string | null;
  easyparcel_status_code: number | null;
  easyparcel_status: string | null;
  refunded_amount: number;
  code_discount: number | null;
  easyparcel_awb_url: string | null;
  easyparcel_tracking_url: string | null;
  lalamove_order_id: string | null;
  lalamove_status: string | null;
  lalamove_share_link: string | null;
  attribution: Attribution | null;
};

const statusStyle: Record<Order["status"], string> = {
  paid: "bg-ok-bg text-ok-fg",
  pending: "bg-warn-bg text-warn-fg",
  failed: "bg-bad-bg text-bad-fg",
};

const fulfilmentStyle: Record<FulfilmentStatus, string> = {
  new: "bg-peach/60 text-choc",
  packed: "bg-warn-bg text-warn-fg",
  shipped: "bg-sunk text-rust",
  delivered: "bg-ok-bg text-ok-fg",
  cancelled: "bg-bad-bg text-bad-fg",
  refunded: "bg-bad-bg text-bad-fg",
};

const LALAMOVE_LABEL: Record<string, string> = {
  ASSIGNING_DRIVER: "finding a rider",
  ON_GOING: "rider on the way to the shop",
  PICKED_UP: "picked up, out for delivery",
  COMPLETED: "delivered",
  CANCELED: "cancelled — book again",
  REJECTED: "rejected — book again",
  EXPIRED: "no rider found — book again",
};

const nextStep: Partial<Record<FulfilmentStatus, FulfilmentStatus>> = {
  new: "packed",
  packed: "shipped",
  shipped: "delivered",
};

const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold";
const linkBtn =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-choc transition-colors hover:bg-cream";

/** Small count card above the order list; links to the matching tab. */
export function OrderStat({ label, count, note, href, Icon, chip }: { label: string; count: number; note: string; href: string; Icon: LucideIcon; chip: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-chunk)] transition-transform hover:-translate-y-0.5"
      >
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${chip}`}>
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="grid min-w-0">
          <span className="font-bubble text-2xl font-extrabold leading-none tabular-nums text-choc">{count}</span>
          <span className="truncate text-sm font-semibold text-ink-2">{label}</span>
          <span className="truncate text-xs text-ink-3">{note}</span>
        </span>
      </Link>
    </li>
  );
}

export function OrderCard({ order, role }: { order: Order; role: "admin" | "staff" }) {
  const pickup = order.shipping_method === "pickup";
  const epLive = !!order.easyparcel_awb_number && !isSandboxAwb(order.easyparcel_awb_number) && order.easyparcel_status_code !== EP_CANCELLED;
  const lmLive = !!order.lalamove_order_id && !LALAMOVE_REBOOKABLE.includes(order.lalamove_status ?? "");
  const refundable = Math.max(0, Math.round((Number(order.total) - Number(order.code_discount ?? 0) - Number(order.refunded_amount)) * 100) / 100);
  const canCancelCourier = order.shipping_method === "easyparcel" && epLive && order.easyparcel_status_code !== 5;
  const DeliveryIcon = pickup ? Store : Truck;

  return (
    <li>
      <details className="group overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-chunk)] open:ring-1 open:ring-peach">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 hover:bg-cream/60 [&::-webkit-details-marker]:hidden">
          <span className="grid min-w-0 gap-1 text-sm">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <strong className="font-bubble text-base font-extrabold text-choc">{order.order_number ?? "Unpaid checkout"}</strong>
              <span className="text-xs text-ink-3">
                {new Date(order.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" })}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
              <span className="inline-flex items-center gap-1">
                <User className="size-3.5 text-ink-3" aria-hidden />
                {order.customer_name ?? "No name"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Package className="size-3.5 text-ink-3" aria-hidden />
                {order.items.length} item{order.items.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1">
                <DeliveryIcon className="size-3.5 text-ink-3" aria-hidden />
                {pickup ? "Store pickup" : order.shipping_method === "lalamove" ? "Lalamove" : order.shipping_method === "easyparcel" ? "Courier" : "—"}
              </span>
            </span>
          </span>
          <span className="flex flex-wrap items-center justify-end gap-1.5">
            {Number(order.refunded_amount) > 0 && (
              <span className={`${pill} bg-bad-bg text-bad-fg`}>
                Refunded {formatMyr(Number(order.refunded_amount))}
                {Number(order.refunded_amount) < Number(order.total) ? " (partial)" : ""}
              </span>
            )}
            {order.easyparcel_status_code != null && !isSandboxAwb(order.easyparcel_awb_number) && (
              <span
                title={order.easyparcel_status ?? undefined}
                className={`${pill} ${EP_PROBLEM.has(order.easyparcel_status_code) ? "bg-bad-bg text-bad-fg" : "border border-line text-ink-2"}`}
              >
                Courier: {EP_STATUS[order.easyparcel_status_code] ?? order.easyparcel_status}
              </span>
            )}
            {order.status === "paid" ? (
              <span className={`${pill} capitalize ${fulfilmentStyle[order.fulfilment_status]}`}>
                <span aria-hidden className="size-1.5 rounded-full bg-current" />
                {order.fulfilment_status}
              </span>
            ) : (
              <span className={`${pill} capitalize ${statusStyle[order.status]}`}>
                <span aria-hidden className="size-1.5 rounded-full bg-current" />
                {order.status}
              </span>
            )}
            <span className="ml-1 font-bubble text-lg font-extrabold tabular-nums text-choc">{formatMyr(order.total)}</span>
            <ChevronDown aria-hidden className="size-5 text-ink-3 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div className="grid gap-4 border-t border-line p-4">
          <ul className="grid gap-1.5 rounded-xl bg-cream p-3 text-sm">
            {order.items.map((item) => (
              <li key={item.variant_id} className="flex justify-between gap-3">
                <span className="text-choc">
                  {item.name} <span className="text-ink-2">({item.title})</span> × {item.qty}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-choc">{formatMyr(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="grid gap-1 text-sm text-ink-2">
            <span className="flex items-start gap-2">
              <User className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
              <span>
                {order.customer_name ?? "No name on file"}
                {order.customer_phone ? ` · ${order.customer_phone}` : ""}
                {order.customer_email ? ` · ${order.customer_email}` : ""}
              </span>
            </span>
            {order.shipping_address && (
              <span className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
                <span>
                  {order.shipping_address.addressLine}, {order.shipping_address.city}, {order.shipping_address.postcode}{" "}
                  {order.shipping_address.state}
                </span>
              </span>
            )}
            <span className="mt-1 w-fit rounded-full bg-sunk px-2.5 py-0.5 text-xs font-semibold text-ink-2">Source: {sourceLabel(order.attribution)}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/orders/${order.id}/packing-slip`} target="_blank" className={linkBtn}>
              <Printer className="size-4 text-terracotta-deep" aria-hidden />
              Print packing list
            </Link>
            {order.easyparcel_awb_url && epLive && (
              <a href={order.easyparcel_awb_url} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                <Printer className="size-4 text-terracotta-deep" aria-hidden />
                Print waybill ({order.easyparcel_order_number})
              </a>
            )}
            {order.easyparcel_tracking_url && epLive && (
              <a href={order.easyparcel_tracking_url} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                <ExternalLink className="size-4 text-terracotta-deep" aria-hidden />
                Track shipment
              </a>
            )}
            {order.lalamove_share_link && (
              <a href={order.lalamove_share_link} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                <ExternalLink className="size-4 text-terracotta-deep" aria-hidden />
                Track rider
              </a>
            )}
          </div>

          {order.status === "paid" && order.shipping_method === "lalamove" && order.lalamove_order_id && (
            <p className="text-sm font-semibold text-choc">Lalamove: {LALAMOVE_LABEL[order.lalamove_status ?? ""] ?? order.lalamove_status}</p>
          )}

          {role === "admin" && order.status === "paid" && order.shipping_method === "easyparcel" && !epLive && (
            <>
              {order.easyparcel_status_code === EP_CANCELLED && !isSandboxAwb(order.easyparcel_awb_number) && (
                <p className="rounded-xl bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg">
                  EasyParcel shipment {order.easyparcel_order_number} was cancelled, so no courier is coming. Book it again
                  below, or refund the order if the customer no longer wants it.
                </p>
              )}
              {isSandboxAwb(order.easyparcel_awb_number) && (
                <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm font-semibold text-warn-fg">
                  This waybill came from the EasyParcel test (sandbox) account, so no courier is coming. Book it again below.
                </p>
              )}
              <BookEasyParcel orderId={order.id} defaultName={order.customer_name ?? ""} defaultPhone={order.customer_phone ?? ""} />
            </>
          )}
          {role === "admin" && order.status === "paid" && order.shipping_method === "lalamove" && !lmLive && (
            <BookEasyParcel carrier="lalamove" orderId={order.id} defaultName={order.customer_name ?? ""} defaultPhone={order.customer_phone ?? ""} />
          )}

          {order.status === "paid" &&
            (pickup ? (
              role === "admin" &&
              nextStep[order.fulfilment_status] && (
                <form action={setFulfilmentStatus} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="order_id" value={order.id} />
                  <button
                    type="submit"
                    name="fulfilment_status"
                    value={order.fulfilment_status === "new" ? "packed" : "delivered"}
                    className="btn-chunk bg-tangerine px-4 py-1.5 text-sm"
                  >
                    {order.fulfilment_status === "new" ? "Mark ready for collection" : "Mark collected"}
                  </button>
                </form>
              )
            ) : (
              <p className="text-xs text-ink-3">
                Status updates automatically: packed when the courier is booked, then shipped and delivered from{" "}
                {order.shipping_method === "lalamove" ? "Lalamove" : "EasyParcel"}.
              </p>
            ))}

          {role === "admin" && order.status === "paid" && !["delivered", "cancelled", "refunded"].includes(order.fulfilment_status) && (
            <OrderDetailsForm
              orderId={order.id}
              name={order.customer_name ?? ""}
              phone={order.customer_phone ?? ""}
              address={order.shipping_address}
              pickup={pickup}
              courierBooked={epLive || lmLive}
            />
          )}

          {role === "admin" && order.status === "paid" && (refundable > 0 || canCancelCourier || order.fulfilment_status !== "cancelled") && (
            <details className="rounded-xl border-2 border-bad-fg/30 px-3 py-2 text-sm">
              <summary className="cursor-pointer font-semibold text-bad-fg">Refund or cancel…</summary>
              <div className="mt-2 grid gap-3">
                <p className="text-xs text-ink-2">These can&apos;t be undone. Each one asks you to confirm first.</p>
                <OrderMoneyActions
                  orderId={order.id}
                  orderNumber={order.order_number ?? "this order"}
                  refundable={refundable}
                  canCancelCourier={canCancelCourier}
                />
                {!["shipped", "delivered", "cancelled", "refunded"].includes(order.fulfilment_status) && (
                  <form action={setFulfilmentStatus}>
                    <input type="hidden" name="order_id" value={order.id} />
                    <button type="submit" name="fulfilment_status" value="cancelled" className="font-semibold text-bad-fg underline">
                      Mark order cancelled
                    </button>
                  </form>
                )}
              </div>
            </details>
          )}
        </div>
      </details>
    </li>
  );
}
