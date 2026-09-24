import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { requireStaff } from "@/lib/auth";
import { formatMyr } from "@/lib/pricing";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Packing list", robots: { index: false } };

type OrderItem = { variant_id: string; name: string; title: string; qty: number; price: number };
type ShippingAddress = { addressLine: string; city: string; postcode: string; state: string } | null;

export default async function PackingSlipPage({ params }: PageProps<"/admin/orders/[id]/packing-slip">) {
  const { supabase } = await requireStaff();
  const { id } = await params;

  const { data } = await supabase
    .from("orders")
    .select("id, created_at, customer_email, subtotal, shipping_cost, total, shipping_method, shipping_address, items")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const order = data as unknown as {
    id: string;
    created_at: string;
    customer_email: string | null;
    subtotal: number;
    shipping_cost: number;
    total: number;
    shipping_method: string | null;
    shipping_address: ShippingAddress;
    items: OrderItem[];
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <div className="rounded-[var(--radius-chunk)] border-2 border-ink p-6 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-ink pb-4">
          <div>
            <p className="font-display text-2xl font-extrabold">{site.name}</p>
            <p className="text-sm text-ink-2">
              {site.address.street}, {site.address.city}, {site.address.postcode} {site.address.state}
            </p>
            <p className="text-sm text-ink-2">{site.phone}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">Packing list</p>
            <p className="text-sm text-ink-2">Order #{order.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-sm text-ink-2">
              {new Date(order.created_at).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-1">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-3">Deliver to</p>
          {order.shipping_address ? (
            <p>
              {order.shipping_address.addressLine}
              <br />
              {order.shipping_address.city}, {order.shipping_address.postcode} {order.shipping_address.state}
            </p>
          ) : (
            <p className="text-ink-2">No delivery address on file (store pickup or WhatsApp order).</p>
          )}
          {order.customer_email && <p className="text-sm text-ink-2">{order.customer_email}</p>}
          {order.shipping_method && <p className="text-sm text-ink-2">Method: {order.shipping_method}</p>}
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2">☐</th>
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.variant_id} className="border-b border-line">
                <td className="py-2">☐</td>
                <td className="py-2">
                  {item.name} <span className="text-ink-2">({item.title})</span>
                </td>
                <td className="py-2 text-right font-bold">{item.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end gap-8 text-sm">
          <span>Subtotal: {formatMyr(order.subtotal)}</span>
          <span>Delivery: {formatMyr(order.shipping_cost)}</span>
          <span className="font-bold">Total: {formatMyr(order.total)}</span>
        </div>
      </div>
    </div>
  );
}
