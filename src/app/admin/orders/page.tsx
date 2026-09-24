import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { BookEasyParcel } from "@/components/admin/book-easyparcel";
import { formatMyr } from "@/lib/pricing";
import { requireStaff } from "@/lib/auth";
import { setFulfilmentStatus, type FulfilmentStatus } from "./actions";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

type OrderItem = { variant_id: string; name: string; title: string; qty: number; price: number };
type ShippingAddress = { addressLine: string; city: string; postcode: string; state: string } | null;
type Order = {
  id: string;
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
  easyparcel_awb_url: string | null;
  easyparcel_tracking_url: string | null;
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

const nextStep: Partial<Record<FulfilmentStatus, FulfilmentStatus>> = {
  new: "packed",
  packed: "shipped",
  shipped: "delivered",
};

export default async function OrdersPage() {
  const { supabase, role } = await requireStaff();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, created_at, status, customer_email, customer_name, customer_phone, total, fulfilment_status, items, shipping_method, shipping_address, easyparcel_order_number, easyparcel_awb_url, easyparcel_tracking_url",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const orders = (data ?? []) as Order[];

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <AdminNav current="/admin/orders" role={role} />
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Orders</h1>
        <p className="text-ink-2">Paid orders come from Stripe checkout. Pending ones never completed payment.</p>
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
                  {new Date(order.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
                </span>
                <span className="flex gap-1.5">
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
              {order.status === "paid" && order.shipping_method === "easyparcel" && (
                order.easyparcel_awb_url ? (
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
                  <BookEasyParcel
                    orderId={order.id}
                    defaultName={order.customer_name ?? ""}
                    defaultPhone={order.customer_phone ?? ""}
                  />
                ) : null
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
