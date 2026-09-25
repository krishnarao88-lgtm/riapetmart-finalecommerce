import { site, whatsappLink } from "@/lib/site";

export const metadata = {
  title: "Returns & refunds",
  description: "Ria Pet Mart's return, exchange and refund policy.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">Returns & refunds</h1>

      <div className="mt-6 grid gap-4 text-choc-2">
        <p>
          Unopened and unused items can be returned or exchanged within 7 days of purchase with your receipt
          or order confirmation.
        </p>
        <p>
          Opened food, treats and health products are final sale for hygiene reasons, unless the item is
          defective or expired on arrival.
        </p>
        <p>
          If we sent you the wrong item, or an item arrives damaged or defective, we&apos;ll replace it or
          refund you in full — no questions asked.
        </p>
        <p>
          To start a return, message us on WhatsApp with your order details and we&apos;ll sort out the next
          step, whether that&apos;s a drop-off at our {site.address.city} shop or a courier pickup.
        </p>
      </div>

      <a
        href={whatsappLink("Hi Ria Pet Mart, I'd like to return/exchange an item.")}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-bubble mt-6 inline-flex bg-terracotta px-6 py-3 text-cream"
      >
        Start a return on WhatsApp
      </a>
    </div>
  );
}
