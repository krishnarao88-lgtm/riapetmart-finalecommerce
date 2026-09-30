import type { Metadata } from "next";
import Link from "next/link";
import { BookEasyParcel } from "@/components/admin/book-easyparcel";
import { type Attribution, sourceLabel } from "@/lib/attribution";
import { formatMyr } from "@/lib/pricing";
import { requireStaff } from "@/lib/auth";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { OrderMoneyActions } from "@/components/admin/order-money-actions";
import { isSandboxAwb } from "@/lib/shipping/easyparcel";
import { EP_CANCELLED, EP_PROBLEM, EP_STATUS } from "@/lib/shipping/easyparcel-status";
import { syncEasyParcelStatuses } from "@/lib/shipping/easyparcel-sync";
import { LALAMOVE_REBOOKABLE } from "@/lib/shipping/lalamove-rules";
import { setFulfilmentStatus, type FulfilmentStatus } from "./actions";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

type OrderItem = { variant_id: string; name: string; title: string; qty: number; price: number };
type ShippingAddress = { addressLine: string; city: string; postcode: string; state: string } | null;
type Order = {
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
  new: "border border-line text-ink-2",
  packed: "bg-warn-bg text-warn-fg",
  shipped: "bg-warn-bg text-warn-fg",
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

export default async function OrdersPage() {
  const { supabase, role } = await requireStaff();
  // Pull the latest courier status for shipments on their way (the webhook does this too; this catches misses).
  await syncEasyParcelStatuses();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_at, status, customer_email, customer_name, customer_phone, total, fulfilment_status, items, shipping_method, shipping_address, easyparcel_order_number, easyparcel_awb_number, easyparcel_awb_url, easyparcel_tracking_url, easyparcel_status_code, easyparcel_status, lalamove_order_id, lalamove_status, lalamove_share_link, attribution, refunded_amount, code_discount",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const orders = (data ?? []) as Order[];

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Orders</h1>
        <p className="text-ink-2">Paid orders come from Stripe checkout. Pending ones never completed payment.</p>
        <AutoRefresh seconds={60} />
      </div>

      {orders.length === 0 ? (
        <p className="rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5 text-ink-2">
          No orders yet.
        </p>
      ) : (
        <ul className="grid gap-3">
          {orders.map((order) => (
            <li key={order.id} className="grid gap-2 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-ink-2">
                  {order.order_number && <strong className="mr-2 text-ink">{order.order_number}</strong>}
                  {new Date(order.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
                </span>
                <span className="flex flex-wrap justify-end gap-1.5">
                  {Number(order.refunded_amount) > 0 && (
                    <span className="rounded-full bg-bad-bg px-2.5 py-1 text-xs font-bold text-bad-fg">
                      Refunded {formatMyr(Number(order.refunded_amount))}
                      {Number(order.refunded_amount) < Number(order.total) ? " (partial)" : ""}
                    </span>
                  )}
                  {order.easyparcel_status_code != null && !isSandboxAwb(order.easyparcel_awb_number) && (
                    <span
                      title={order.easyparcel_status ?? undefined}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${EP_PROBLEM.has(order.easyparcel_status_code) ? "bg-bad-bg text-bad-fg" : "border border-line text-ink-2"}`}
                    >
                      Courier: {EP_STATUS[order.easyparcel_status_code] ?? order.easyparcel_status}
                    </span>
                  )}
                  {order.status === "paid" && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${fulfilmentStyle[order.fulfilment_status]}`}>
                      {order.fulfilment_status}
                    </span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[order.status]}`}>
                    {order.status}
                  </span>
                </span>
              </div>
              <ul className="grid gap-1 text-sm">
                {order.items.map((item) => (
                  <li key={item.variant_id} className="flex justify-between gap-2">
                    <span>
                      {item.name} <span className="text-ink-2">({item.title})</span> × {item.qty}
                    </span>
                    <span className="font-semibold">{formatMyr(item.price * item.qty)}</span>
                  </li>
                ))}
              </ul>
              {order.shipping_address && (
                <p className="text-sm text-ink-2">
                  {order.shipping_method ? `${order.shipping_method} — ` : ""}
                  {order.shipping_address.addressLine}, {order.shipping_address.city},{" "}
                  {order.shipping_address.postcode} {order.shipping_address.state}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                <span className="text-sm text-ink-2">
                  {order.customer_name ?? "No name on file"}
                  {order.customer_phone ? ` · ${order.customer_phone}` : ""}
                  {order.customer_email ? ` · ${order.customer_email}` : ""}
                  <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs">
                    Source: {sourceLabel(order.attribution)}
                  </span>
                </span>
                <span className="font-display text-lg font-extrabold">{formatMyr(order.total)}</span>
              </div>
              {role === "admin" && order.status === "paid" && nextStep[order.fulfilment_status] && (
                <form action={setFulfilmentStatus} className="flex flex-wrap gap-2">
                  <input type="hidden" name="order_id" value={order.id} />
                  <button
                    type="submit"
                    name="fulfilment_status"
                    value={nextStep[order.fulfilment_status]}
                    className="btn-chunk bg-tangerine px-3 py-1.5 text-sm"
                  >
                    Mark {nextStep[order.fulfilment_status]}
                  </button>
                  {order.fulfilment_status !== "shipped" && (
                    <button type="submit" name="fulfilment_status" value="cancelled" className="btn-chunk bg-surface px-3 py-1.5 text-sm">
                      Cancel order
                    </button>
                  )}
                </form>
              )}
              <Link
                href={`/admin/orders/${order.id}/packing-slip`}
                target="_blank"
                className="w-fit text-sm font-semibold text-grape underline"
              >
                Print packing list
              </Link>
              {role === "admin" && order.status === "paid" && (
                <OrderMoneyActions
                  orderId={order.id}
                  orderNumber={order.order_number ?? "this order"}
                  refundable={Math.max(0, Math.round((Number(order.total) - Number(order.code_discount ?? 0) - Number(order.refunded_amount)) * 100) / 100)}
                  canCancelCourier={
                    order.shipping_method === "easyparcel" &&
                    !!order.easyparcel_awb_number &&
                    !isSandboxAwb(order.easyparcel_awb_number) &&
                    order.easyparcel_status_code !== EP_CANCELLED &&
                    order.easyparcel_status_code !== 5
                  }
                />
              )}
              {order.status === "paid" && order.shipping_method === "easyparcel" && (
                order.easyparcel_awb_url &&
                !isSandboxAwb(order.easyparcel_awb_number) &&
                order.easyparcel_status_code !== EP_CANCELLED ? (
                  <div className="flex flex-wrap gap-3 text-sm font-semibold">
                    <a href={order.easyparcel_awb_url} target="_blank" rel="noopener noreferrer" className="text-grape underline">
                      Print waybill ({order.easyparcel_order_number})
                    </a>
                    {order.easyparcel_tracking_url && (
                      <a href={order.easyparcel_tracking_url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline">
                        Track shipment
                      </a>
                    )}
                  </div>
                ) : role === "admin" ? (
                  <>
                  {order.easyparcel_status_code === EP_CANCELLED && !isSandboxAwb(order.easyparcel_awb_number) && (
                    <p className="rounded-xl bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg">
                      EasyParcel shipment {order.easyparcel_order_number} was cancelled, so no courier is coming. Book it
                      again below, or cancel/refund the order if the customer no longer wants it.
                    </p>
                  )}
                  {isSandboxAwb(order.easyparcel_awb_number) && (
                    <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm font-semibold text-warn-fg">
                      This waybill came from the EasyParcel test (sandbox) account, so no courier is coming. Reconnect
                      EasyParcel with your live account in Settings, then book it again below.
                    </p>
                  )}
                  <BookEasyParcel
                    orderId={order.id}
                    defaultName={order.customer_name ?? ""}
                    defaultPhone={order.customer_phone ?? ""}
                  />
                  </>
                ) : null
              )}
              {order.status === "paid" && order.shipping_method === "lalamove" && (
                <div className="grid gap-2">
                  {order.lalamove_order_id && (
                    <p className="flex flex-wrap gap-3 text-sm font-semibold">
                      <span>Lalamove: {LALAMOVE_LABEL[order.lalamove_status ?? ""] ?? order.lalamove_status}</span>
                      {order.lalamove_share_link && (
                        <a href={order.lalamove_share_link} target="_blank" rel="noopener noreferrer" className="text-grape underline">
                          Track rider
                        </a>
                      )}
                    </p>
                  )}
                  {role === "admin" && (!order.lalamove_order_id || LALAMOVE_REBOOKABLE.includes(order.lalamove_status ?? "")) && (
                    <BookEasyParcel
                      carrier="lalamove"
                      orderId={order.id}
                      defaultName={order.customer_name ?? ""}
                      defaultPhone={order.customer_phone ?? ""}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
