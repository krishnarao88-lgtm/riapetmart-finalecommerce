import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatMyr } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { signOutAccount } from "./actions";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

type OrderItem = { variant_id: string; name: string; title: string; qty: number; price: number };
type Order = {
  id: string;
  created_at: string;
  status: "pending" | "paid" | "failed";
  total: number;
  shipping_cost: number;
  shipping_method: string | null;
  easyparcel_tracking_url: string | null;
  items: OrderItem[];
};

const statusStyle: Record<Order["status"], string> = {
  paid: "bg-ok-bg text-ok-fg",
  pending: "bg-warn-bg text-warn-fg",
  failed: "bg-bad-bg text-bad-fg",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  // RLS restricts this to the signed-in user's own orders (customer_email match) —
  // no manual filtering needed here.
  const [{ data }, { data: referralCode }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, created_at, status, total, shipping_cost, shipping_method, easyparcel_tracking_url, items")
      .order("created_at", { ascending: false }),
    supabase.rpc("get_or_create_my_referral_code"),
  ]);
  const orders = (data ?? []) as Order[];
  const referralUrl = referralCode ? `https://riapetmart.com/shop?ref=${referralCode}` : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm text-choc-2">Signed in as {user.email}</p>
          <h1 className="font-bubble text-3xl font-extrabold text-choc">My orders</h1>
        </div>
        <form action={signOutAccount}>
          <button type="submit" className="btn-bubble bg-surface px-4 py-2 text-choc">
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </form>
      </div>

      {referralUrl && (
        <div className="rounded-2xl border-2 border-choc bg-peach/40 p-4">
          <p className="font-bold text-choc">Give 10%, get 10%</p>
          <p className="mt-1 text-sm text-choc-2">
            Share your link — your friend can sign up on the site for a 10% welcome code on their first order. Once
            they pay, we&apos;ll email you a 10% code too.
          </p>
          <p className="mt-3 break-all rounded-xl border-2 border-dashed border-rust bg-surface px-3 py-2 font-mono text-sm text-choc">
            {referralUrl}
          </p>
        </div>
      )}

      {orders.length === 0 ? (
        <p className="rounded-2xl border-2 border-choc bg-surface p-6 text-choc-2">
          No orders found for this email yet.
        </p>
      ) : (
        <ul className="grid gap-3">
          {orders.map((order) => (
            <li key={order.id} className="grid gap-2 rounded-2xl border-2 border-choc bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-choc-2">
                  {new Date(order.created_at).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[order.status]}`}>
                  {order.status}
                </span>
              </div>
              <ul className="grid gap-1 text-sm text-choc">
                {order.items.map((item) => (
                  <li key={item.variant_id} className="flex justify-between gap-2">
                    <span>
                      {item.name} <span className="text-choc-2">({item.title})</span> × {item.qty}
                    </span>
                    <span className="font-semibold">{formatMyr(item.price * item.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-choc/20 pt-2">
                <span className="text-sm text-choc-2">
                  {order.shipping_method && order.shipping_method !== "pickup"
                    ? `Delivery (${order.shipping_method}): ${order.shipping_cost > 0 ? formatMyr(order.shipping_cost) : "Free"}`
                    : "Store pickup"}
                </span>
                <span className="font-bubble text-lg font-extrabold text-choc">
                  {formatMyr(order.total)}
                </span>
              </div>
              {order.easyparcel_tracking_url && (
                <a
                  href={order.easyparcel_tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-fit text-sm font-semibold text-rust underline"
                >
                  Track shipment
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
