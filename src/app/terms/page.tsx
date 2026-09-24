import Link from "next/link";
import { site, whatsappLink } from "@/lib/site";

export const metadata = {
  title: "Terms of service",
  description: "Terms of service for using the Ria Pet Mart website and ordering from our shop.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">Terms of service</h1>
      <p className="mt-2 text-sm text-choc-2">Last updated: 25 September 2026</p>

      <div className="mt-6 grid gap-4 text-choc-2">
        <p>
          These terms apply when you use this website or place an order with {site.name} (&quot;we&quot;,
          &quot;us&quot;), based in {site.address.city}, {site.address.state}, Malaysia. By using the site or
          placing an order, you agree to them.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Orders and pricing</h2>
        <p>
          Prices are shown in Malaysian Ringgit (MYR) and may change without notice. We try to keep stock and
          pricing accurate, but if an item is mispriced or out of stock after you order, we&apos;ll contact you
          before charging or fulfilling it. A confirmed order is one that has been paid for through checkout or
          confirmed with us on WhatsApp.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Payment</h2>
        <p>
          Online payments are processed securely by Stripe (FPX, cards, GrabPay, Apple Pay, Google Pay). We
          never see or store your full card details. Orders placed via WhatsApp may be paid by other methods we
          agree on directly.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Delivery and pickup</h2>
        <p>
          Delivery estimates (same-day Klang Valley, nationwide courier, or free store pickup) are estimates,
          not guarantees, and can be affected by courier delays, weather, or circumstances outside our control.
          Pickup orders should be collected during our opening hours ({site.hours.days},{" "}
          {site.hours.opens}–{site.hours.closes}).
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Returns and refunds</h2>
        <p>
          See our{" "}
          <Link href="/returns" className="underline">
            returns and refunds policy
          </Link>{" "}
          for how to return an unopened item or report a damaged or wrong item.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Reviews</h2>
        <p>
          Reviews on this site are submitted by real customers and read by us before publishing. We don&apos;t
          edit review text or invent reviews. Submitting a review that is false, defamatory, or not based on a
          genuine experience with us may result in it being rejected or removed.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Cat Hotel and grooming bookings</h2>
        <p>
          Booking requests submitted through the site are requests, not confirmed reservations, until we
          confirm availability with you directly by WhatsApp or phone. Rates shown are current estimates and
          may be confirmed or adjusted when we contact you.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Website use</h2>
        <p>
          You agree not to misuse this site — for example, attempting to disrupt it, scrape it at scale, or use
          it for any unlawful purpose. Product photos and descriptions are for reference; actual packaging may
          vary slightly by batch.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Limitation of liability</h2>
        <p>
          To the extent permitted by Malaysian law, we are not liable for indirect or consequential losses
          arising from use of this site or delayed/failed delivery outside our reasonable control. This does
          not limit any liability that cannot be excluded by law.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Changes to these terms</h2>
        <p>We may update these terms from time to time. Continued use of the site after a change means you accept the update.</p>

        <h2 className="font-bubble text-xl font-bold text-choc">Governing law</h2>
        <p>These terms are governed by the laws of Malaysia.</p>

        <h2 className="font-bubble text-xl font-bold text-choc">Contact us</h2>
        <p>
          {site.name}, {site.address.street}, {site.address.postcode} {site.address.city}, {site.address.state}
          <br />
          Email: <a href={`mailto:${site.email}`} className="underline">{site.email}</a> · Phone/WhatsApp:{" "}
          {site.phone}
        </p>
      </div>

      <a
        href={whatsappLink("Hi Ria Pet Mart, I have a question about your terms of service.")}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-bubble mt-6 inline-flex bg-terracotta px-6 py-3 text-cream"
      >
        Ask us on WhatsApp
      </a>
    </div>
  );
}
