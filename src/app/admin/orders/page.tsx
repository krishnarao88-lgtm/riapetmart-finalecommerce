import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { formatMyr } from "@/lib/pricing";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

type OrderItem = { variant_id: string; name: string; title: string; qty: number; price: number };
type Order = {
  id: string;
  created_at: string;
  status: "pending" | "paid" | "failed";
  customer_email: string | null;
  subtotal: number;
  items: OrderItem[];
};

const statusStyle: Record<Order["status"], string> = {
  paid: "bg-ok-bg text-ok-fg",
  pending: "bg-warn-bg text-warn-fg",
  failed: "bg-bad-bg text-bad-fg",
};

export default async function OrdersPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("orders")
    .select("id, created_at, status, customer_email, subtotal, items")
    .order("created_at", { ascending: false })
    .limit(200);

  const orders = (data ?? []) as Order[];

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <AdminNav current="/admin/orders" />
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
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[order.status]}`}>
                  {order.status}
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
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="text-sm text-ink-2">{order.customer_email ?? "No email on file"}</span>
                <span className="font-display text-lg font-extrabold">{formatMyr(order.subtotal)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
