import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BuyAgainButton } from "@/components/buy-again-button";
import { getVariantStock } from "@/components/product-card";
import type { CartLine } from "@/lib/cart-context";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { formatMyr } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { signOutAccount } from "./actions";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

type OrderItem = { variant_id: string; name: string; title: string; qty: number; price: number };
type Order = {
  id: string;
  order_number: string | null;
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
      .select("id, order_number, created_at, status, total, shipping_cost, shipping_method, easyparcel_tracking_url, items")
      .order("created_at", { ascending: false }),
    supabase.rpc("get_or_create_my_referral_code"),
  ]);
  const orders = (data ?? []) as Order[];

  // Current price and stock for everything in past paid orders, priced like checkout (short-dated discount included).
  // RLS only returns active variants of published products, so anything retired is simply missing.
  const variantIds = [...new Set(orders.filter((o) => o.status === "paid").flatMap((o) => o.items.map((i) => i.variant_id)))];
  const [{ data: variants }, { data: settingsRow }, stock] = variantIds.length
    ? await Promise.all([
        supabase
          .from("variants")
          .select("id, title, price, products(slug, name, product_images(path))")
          .in("id", variantIds),
        supabase.from("settings").select("value").eq("key", "expiry_badges").maybeSingle(),
        getVariantStock(supabase, variantIds),
      ])
    : [{ data: [] }, { data: null }, null];
  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
  const current = new Map((variants ?? []).map((v) => [v.id, v]));
  function buyAgain(items: OrderItem[]) {
    const lines: CartLine[] = [];
    const skipped: string[] = [];
    for (const item of items) {
      const v = current.get(item.variant_id);
      const s = stock?.get(item.variant_id);
      const product = v?.products as unknown as { slug: string; name: string; product_images: { path: string }[] } | null;
      if (!v || !product || (stock && !s?.available)) {
        skipped.push(`${item.name} (${item.title})`);
        continue;
      }
      const badge = getExpiryBadge(s?.nearest_expiry ?? null, expirySettings);
      lines.push({
        variantId: v.id,
        productSlug: product.slug,
        productName: product.name,
        variantTitle: v.title,
        price: badge?.kind === "short-dated" ? discountedPrice(v.price, badge.discount) : Number(v.price),
        image: product.product_images[0]?.path ?? null,
        qty: Math.min(item.qty, s?.available ?? item.qty),
      });
    }
    return { lines, skipped };
  }
  const referralUrl = referralCode ? `https://riapetmart.com/shop?ref=${referralCode}` : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm text-choc-2">Signed in as {user.email}</p>
          <h1 className="font-bubble text-3xl font-extrabold text-choc">My orders</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/account/password" className="text-sm text-choc-2 underline hover:text-choc">
            Change password
          </Link>
          <form action={signOutAccount}>
            <button type="submit" className="btn-bubble bg-surface px-4 py-2 text-choc">
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </div>

      {referralUrl && (
        <div className="rounded-2xl card-soft bg-peach/40 p-4">
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
        <p className="rounded-2xl card-soft bg-surface p-6 text-choc-2">
          No orders found for this email yet.
        </p>
      ) : (
        <ul className="grid gap-3">
          {orders.map((order) => (
            <li key={order.id} className="grid gap-2 rounded-2xl card-soft bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-choc-2">
                  {order.order_number && <strong className="mr-2 text-choc">{order.order_number}</strong>}
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
              {order.status === "paid" && <BuyAgainButton {...buyAgain(order.items)} />}
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
