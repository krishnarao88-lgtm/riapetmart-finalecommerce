import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ClearCartOnMount } from "@/components/clear-cart-on-mount";
import { GoogleReviewsOptIn } from "@/components/google-reviews-optin";
import { TrackPurchase } from "@/components/track-purchase";
import { REFERRAL_PITCH } from "@/lib/emails";
import { formatMyr } from "@/lib/pricing";
import { referralLinkFor } from "@/lib/referral";
import { site } from "@/lib/site";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Google sends the review survey after this date: pickup/Lalamove land within a day, couriers within ~5.
function deliveryDate(method: string | undefined) {
  const days = method === "pickup" || method === "lalamove" ? 1 : 5;
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

type OrderItem ={ variant_id: string; name: string; title: string; qty: number; price: number };

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const session = session_id ? await getStripe().checkout.sessions.retrieve(session_id).catch(() => null) : null;
  const paid = session?.payment_status === "paid";

  const { data: order } = paid && session_id
    ? ((await createServiceClient().rpc("get_order_for_email", { p_session_id: session_id }).single()) as {
        data: { id: string; items: OrderItem[]; order_number: string | null } | null;
      })
    : { data: null };
  const items = order?.items ?? [];
  const customerEmail = paid ? session?.customer_details?.email : null;
  const referralUrl = customerEmail ? await referralLinkFor(customerEmail).catch(() => null) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      {paid && <ClearCartOnMount />}
      {paid && order?.id && session?.amount_total != null && (
        <TrackPurchase
          orderId={order.id}
          value={session.amount_total / 100}
          items={items.map((it) => ({
            item_id: it.variant_id,
            item_name: it.name,
            item_variant: it.title,
            price: it.price,
            quantity: it.qty,
          }))}
        />
      )}
      {paid && order?.id && session?.customer_details?.email && (
        <GoogleReviewsOptIn
          orderId={order.order_number ?? order.id}
          email={session.customer_details.email}
          deliveryDate={deliveryDate(session.metadata?.delivery_method)}
        />
      )}
      <CheckCircle2 className="mx-auto size-14 text-ok-fg" aria-hidden />
      <h1 className="mt-4 font-bubble text-3xl font-extrabold text-choc">
        {paid ? "Thanks for your order!" : "Checking your payment…"}
      </h1>
      <p className="mt-2 text-choc-2">
        {paid
          ? "We've received your payment and will get your order ready. You'll hear from us on WhatsApp shortly."
          : "If you completed payment, refresh this page in a moment. Otherwise, your cart is still saved."}
      </p>

      {paid && order?.order_number && (
        <p className="mt-4 text-sm font-semibold text-choc-2">Order {order.order_number}</p>
      )}

      {paid && items.length > 0 && (
        <ul className="mt-4 grid gap-1.5 rounded-2xl card-soft bg-surface p-4 text-left">
          {items.map((it) => (
            <li key={`${it.name}-${it.title}`} className="flex justify-between gap-2 text-sm text-choc">
              <span>
                {it.name} <span className="text-choc-2">({it.title})</span> × {it.qty}
              </span>
              <span className="font-semibold">{formatMyr(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>
      )}

      {paid && session?.amount_total && (
        <p className="mt-4 text-xl font-bold text-choc">{formatMyr(session.amount_total / 100)}</p>
      )}
      <Link href="/shop" className="btn-bubble mt-6 inline-flex bg-terracotta px-6 py-3 text-cream">
        Continue shopping
      </Link>

      {referralUrl && (
        <section aria-label="Refer a friend" className="mt-8 grid gap-2 rounded-3xl card-soft bg-peach/40 p-5 text-left">
          <h2 className="font-bubble text-lg font-extrabold text-choc">Share with a friend, get 10% off</h2>
          <p className="text-sm text-choc-2">{REFERRAL_PITCH}</p>
          <p className="break-all rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-choc select-all">{referralUrl}</p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`I order my pet food from ${site.name}, same-day delivery around Rawang & KL: ${referralUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-bubble w-fit bg-rust px-4 py-2 text-sm text-cream"
          >
            Share on WhatsApp
          </a>
        </section>
      )}
    </div>
  );
}
