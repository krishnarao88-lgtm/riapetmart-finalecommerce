import { CircleDollarSign, PackageCheck, PackageOpen, Search, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { OrderCard, OrderStat, type Order } from "@/components/admin/order-card";
import { syncEasyParcelStatuses } from "@/lib/shipping/easyparcel-sync";
import { type FulfilmentStatus } from "./actions";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

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
    <div className="mx-auto grid max-w-5xl gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="grid gap-0.5">
          <h1 className="font-bubble text-3xl font-extrabold text-choc">Orders</h1>
          <p className="text-sm text-ink-2">Paid orders come from Stripe checkout. Unpaid ones never completed payment.</p>
        </div>
        <AutoRefresh seconds={60} />
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OrderStat label="New" count={counts.new} note="Paid, not packed yet" href={href("new")} Icon={PackageOpen} chip="bg-peach/60 text-rust" />
        <OrderStat label="Ready to ship" count={counts.ready} note="Packed, waiting pickup" href={href("ready")} Icon={PackageCheck} chip="bg-warn-bg text-warn-fg" />
        <OrderStat label="Shipped" count={counts.shipped} note="On the way" href={href("shipped")} Icon={Truck} chip="bg-ok-bg text-ok-fg" />
        <OrderStat label="Unpaid" count={counts.unpaid} note="Checkout not completed" href={href("unpaid")} Icon={CircleDollarSign} chip="bg-bad-bg text-bad-fg" />
      </ul>

      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-chunk)] sm:p-4">
        <nav aria-label="Order status" className="flex flex-wrap gap-1.5">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <Link
              key={t}
              href={href(t)}
              aria-current={t === tab ? "page" : undefined}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors ${
                t === tab ? "bg-choc text-cream" : "bg-sunk text-ink-2 hover:bg-peach/50"
              }`}
            >
              {TABS[t].label}{" "}
              <span className={`rounded-full px-1.5 text-xs font-bold tabular-nums ${t === tab ? "bg-white/15 text-cream" : "bg-surface text-ink-2"}`}>
                {counts[t]}
              </span>
            </Link>
          ))}
        </nav>
        <form action="/admin/orders" className="flex flex-wrap gap-2">
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <label className="sr-only" htmlFor="order-search">Search orders</label>
          <span className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              id="order-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Order number, name, phone or email"
              className="min-h-11 w-full rounded-xl border border-line bg-ground pr-3 pl-9 text-sm placeholder:text-ink-3"
            />
          </span>
          <button type="submit" className="btn-chunk bg-choc px-5 text-sm text-cream">Search</button>
          {q && (
            <Link href={href(tab).replace(/[?&]q=[^&]*/, "")} className="self-center text-sm font-semibold text-terracotta-deep underline">
              Clear
            </Link>
          )}
        </form>
      </div>

      {orders.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-peach/50 text-rust">
            <PackageOpen className="size-6" aria-hidden />
          </span>
          <p className="text-ink-2">{q ? `No orders match "${q}".` : "No orders here."}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} role={role} />
          ))}
        </ul>
      )}
    </div>
  );
}
