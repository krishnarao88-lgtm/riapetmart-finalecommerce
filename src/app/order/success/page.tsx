import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ClearCartOnMount } from "@/components/clear-cart-on-mount";
import { formatMyr } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const session = session_id ? await getStripe().checkout.sessions.retrieve(session_id).catch(() => null) : null;
  const paid = session?.payment_status === "paid";

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      {paid && <ClearCartOnMount />}
      <CheckCircle2 className="mx-auto size-14 text-ok-fg" aria-hidden />
      <h1 className="mt-4 font-bubble text-3xl font-extrabold text-choc">
        {paid ? "Thanks for your order!" : "Checking your payment…"}
      </h1>
      <p className="mt-2 text-choc-2">
        {paid
          ? "We've received your payment and will get your order ready. You'll hear from us on WhatsApp shortly."
          : "If you completed payment, refresh this page in a moment. Otherwise, your cart is still saved."}
      </p>
      {paid && session?.amount_total && (
        <p className="mt-4 text-xl font-bold text-choc">{formatMyr(session.amount_total / 100)}</p>
      )}
      <Link href="/shop" className="btn-bubble mt-6 inline-flex bg-terracotta px-6 py-3 text-cream">
        Continue shopping
      </Link>
    </div>
  );
}
