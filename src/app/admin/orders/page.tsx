import type { Metadata } from "next";
import Link from "next/link";
import { BookEasyParcel } from "@/components/admin/book-easyparcel";
import { type Attribution, sourceLabel } from "@/lib/attribution";
import { formatMyr } from "@/lib/pricing";
import { requireStaff } from "@/lib/auth";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { OrderDetailsForm } from "@/components/admin/order-details-form";
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

const TABS = {
  all: { label: "All" },
  new: { label: "New", status: "paid", fulfilment: ["new"] },
  ready: { label: "Ready to ship", status: "paid", fulfilment: ["packed"] },
  shipped: { label: "Shipped", status: "paid", fulfilment: ["shipped"] },
  delivered: { label: "Delivered", status: "paid", fulfilment: ["delivered"] },
  closed: { label: "Cancelled / refunded", status: "paid", fulfilment: ["cancelled", "refunded"] },
  unpaid: { label: "Unpaid", unpaid: true },
} as const satisfies Record<string, { label: string; status?: string; fulfilment?: readonly FulfilmentStatus[]; unpaid?: boolean }>;
type Tab = keyof typeof TABS;

function inTab(tab: Tab, o: { status: string; fulfilment_status: string }) {
  const t = TABS[tab] as { status?: string; fulfilment?: readonly string[]; unpaid?: boolean };
  if (t.unpaid) return o.status !== "paid";
  if (t.status && o.status !== t.status) return false;
  return !t.fulfilment || t.fulfilment.includes(o.fulfilment_status);
}

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const { tab: tabParam, q: qParam } = await searchParams;
  const tab: Tab = typeof tabParam === "string" && tabParam in TABS ? (tabParam as Tab) : "all";
  // Search box text, stripped of characters that mean something in a PostgREST filter.
  const q = (typeof qParam === "string" ? qParam : "").replace(/[,()*%\\]/g, " ").trim().slice(0, 50);
  const { supabase, role } = await requireStaff();
  // Pull the latest courier status for shipments on their way (the webhook does this too; this catches misses).
  await syncEasyParcelStatuses();
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, created_at, status, customer_email, customer_name, customer_phone, total, fulfilment_status, items, shipping_method, shipping_address, easyparcel_order_number, easyparcel_awb_number, easyparcel_awb_url, easyparcel_tracking_url, easyparcel_status_code, easyparcel_status, lalamove_order_id, lalamove_status, lalamove_share_link, attribution, refunded_amount, code_discount",
    )
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `order_number.ilike.${like},customer_name.ilike.${like},customer_phone.ilike.${like},customer_email.ilike.${like}`,
    );
  }
  const [{ data }, { data: statusRows }] = await Promise.all([
    query,
    supabase.from("orders").select("status, fulfilment_status").eq("is_test", false).limit(2000),
  ]);

  const orders = ((data ?? []) as Order[]).filter((o) => inTab(tab, o));
  const counts = Object.fromEntries(
    (Object.keys(TABS) as Tab[]).map((t) => [t, (statusRows ?? []).filter((o) => inTab(t, o)).length]),
  ) as Record<Tab, number>;
  const href = (t: Tab) => `/admin/orders?${new URLSearchParams({ ...(t === "all" ? {} : { tab: t }), ...(q ? { q } : {}) })}`;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Orders</h1>
        <p className="text-ink-2">Paid orders come from Stripe checkout. Unpaid ones never completed payment.</p>
        <AutoRefresh seconds={60} />
      </div>

      <div className="grid gap-3">
        <nav aria-label="Order status" className="flex flex-wrap gap-1.5">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <Link
              key={t}
              href={href(t)}
              aria-current={t === tab ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${t === tab ? "bg-ink text-ground" : "border border-line bg-surface text-ink-2"}`}
            >
              {TABS[t].label} <span className="tabular-nums opacity-70">{counts[t]}</span>
            </Link>
          ))}
        </nav>
        <form action="/admin/orders" className="flex gap-2">
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <label className="sr-only" htmlFor="order-search">Search orders</label>
          <input
            id="order-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Order number, name, phone or email"
            className="min-w-0 flex-1 rounded-xl border-2 border-line bg-surface px-3 py-2 text-sm"
          />
          <button type="submit" className="btn-chunk bg-surface px-4 py-2 text-sm">Search</button>
          {q && (
            <Link href={href(tab).replace(/[?&]q=[^&]*/, "")} className="self-center text-sm text-ink-2 underline">
              Clear
            </Link>
          )}
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5 text-ink-2">
          {q ? `No orders match "${q}".` : "No orders here."}
        </p>
      ) : (
        <ul className="grid gap-2">
          {orders.map((order) => {
            const pickup = order.shipping_method === "pickup";
            const epLive = !!order.easyparcel_awb_number && !isSandboxAwb(order.easyparcel_awb_number) && order.easyparcel_status_code !== EP_CANCELLED;
            const lmLive = !!order.lalamove_order_id && !LALAMOVE_REBOOKABLE.includes(order.lalamove_status ?? "");
            const refundable = Math.max(0, Math.round((Number(order.total) - Number(order.code_discount ?? 0) - Number(order.refunded_amount)) * 100) / 100);
            const canCancelCourier = order.shipping_method === "easyparcel" && epLive && order.easyparcel_status_code !== 5;
            return (
              <li key={order.id}>
                <details className="group rounded-[var(--radius-chunk)] border-2 border-ink bg-surface">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-3">
                    <span className="grid gap-0.5 text-sm">
                      <span>
                        <strong className="mr-2 text-ink">{order.order_number ?? "Unpaid checkout"}</strong>
                        <span className="text-ink-2">
                          {new Date(order.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      </span>
                      <span className="text-ink-2">
                        {order.customer_name ?? "No name"} · {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                        {pickup ? "Store pickup" : order.shipping_method === "lalamove" ? "Lalamove" : order.shipping_method === "easyparcel" ? "Courier" : "—"}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
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
                      {order.status === "paid" ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${fulfilmentStyle[order.fulfilment_status]}`}>
                          {order.fulfilment_status}
                        </span>
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[order.status]}`}>{order.status}</span>
                      )}
                      <span className="font-display text-base font-extrabold tabular-nums">{formatMyr(order.total)}</span>
                      <span aria-hidden className="text-ink-2 transition-transform group-open:rotate-180">▾</span>
                    </span>
                  </summary>

                  <div className="grid gap-3 border-t border-line p-3">
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

                    <div className="grid gap-0.5 text-sm text-ink-2">
                      <span>
                        {order.customer_name ?? "No name on file"}
                        {order.customer_phone ? ` · ${order.customer_phone}` : ""}
                        {order.customer_email ? ` · ${order.customer_email}` : ""}
                      </span>
                      {order.shipping_address && (
                        <span>
                          {order.shipping_address.addressLine}, {order.shipping_address.city}, {order.shipping_address.postcode}{" "}
                          {order.shipping_address.state}
                        </span>
                      )}
                      <span className="w-fit rounded-full border border-line px-2 py-0.5 text-xs">Source: {sourceLabel(order.attribution)}</span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm font-semibold">
                      <Link href={`/admin/orders/${order.id}/packing-slip`} target="_blank" className="text-grape underline">
                        Print packing list
                      </Link>
                      {order.easyparcel_awb_url && epLive && (
                        <a href={order.easyparcel_awb_url} target="_blank" rel="noopener noreferrer" className="text-grape underline">
                          Print waybill ({order.easyparcel_order_number})
                        </a>
                      )}
                      {order.easyparcel_tracking_url && epLive && (
                        <a href={order.easyparcel_tracking_url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline">
                          Track shipment
                        </a>
                      )}
                      {order.lalamove_share_link && (
                        <a href={order.lalamove_share_link} target="_blank" rel="noopener noreferrer" className="text-grape underline">
                          Track rider
                        </a>
                      )}
                    </div>

                    {order.status === "paid" && order.shipping_method === "lalamove" && order.lalamove_order_id && (
                      <p className="text-sm font-semibold">Lalamove: {LALAMOVE_LABEL[order.lalamove_status ?? ""] ?? order.lalamove_status}</p>
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
                              className="btn-chunk bg-tangerine px-3 py-1.5 text-sm"
                            >
                              {order.fulfilment_status === "new" ? "Mark ready for collection" : "Mark collected"}
                            </button>
                          </form>
                        )
                      ) : (
                        <p className="text-xs text-ink-2">
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
          })}
        </ul>
      )}
    </div>
  );
}
