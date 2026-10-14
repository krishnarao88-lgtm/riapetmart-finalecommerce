import { Bike, Clock, PackageCheck, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { freeDeliveryCap, freeDeliveryMin, getDeliverySettings } from "@/lib/delivery-settings";
import { formatMyr } from "@/lib/pricing";
import { SAME_DAY_CUTOFF_HOUR } from "@/lib/shipping/lalamove-rules";
import { site, whatsappLink } from "@/lib/site";

// Search Console (Oct 2026): "pet shop delivery" shows the site at ~#27 with no page built for it.
export const metadata: Metadata = {
  title: "Pet Food Delivery in Rawang, Selangor & KL: Same Day",
  description:
    "Same-day pet food delivery in Selangor & KL when you pay by 1pm (Mon–Sat), courier anywhere in Malaysia, or free pickup at our Bukit Beruntung pet shop. Penghantaran makanan kucing & anjing hari yang sama.",
  alternates: { canonical: "/delivery" },
};

export const revalidate = 300;

const AREAS = ["Bukit Beruntung", "Rawang", "Kuang", "Serendah", "Batang Kali", "Selayang", "Kepong", "Sungai Buloh", "Batu Caves", "Kuala Lumpur", "Petaling Jaya", "Shah Alam"];
const cutoff = `${SAME_DAY_CUTOFF_HOUR > 12 ? SAME_DAY_CUTOFF_HOUR - 12 : SAME_DAY_CUTOFF_HOUR}${SAME_DAY_CUTOFF_HOUR >= 12 ? "pm" : "am"}`;

export default async function DeliveryPage() {
  const d = await getDeliverySettings();
  const min = freeDeliveryMin(d);
  const cap = freeDeliveryCap(d);
  const states = (d.same_day_states ?? []).join(", ");
  const freeLine =
    min === null ? null : cap === null ? `Free delivery on orders of ${formatMyr(min)} or more.` : `Orders of ${formatMyr(min)} or more get up to ${formatMyr(cap)} off delivery.`;

  const faq = [
    {
      q: "Do you deliver pet food the same day?",
      a: `Yes, in ${states || "Selangor and KL"}: pay by ${cutoff} Monday to Saturday and a Lalamove rider brings it the same day. Orders after ${cutoff}, or on Sunday, go out the next working day.`,
    },
    { q: "Do you deliver outside the Klang Valley?", a: "Yes. We ship anywhere in Malaysia, Sabah and Sarawak included, by courier. The rate for your postcode is shown at checkout before you pay." },
    { q: "How much is delivery?", a: `It depends on your postcode and the parcel weight, and you see the exact price at checkout.${freeLine ? ` ${freeLine}` : ""}` },
    { q: "Can I collect in store instead?", a: `Yes, free. Choose pickup at checkout and collect from ${site.address.street}, ${site.address.city}, ${site.hours.days} ${site.hours.opens}–${site.hours.closes}.` },
    { q: "Can you deliver heavy bags of food?", a: "Yes. Big bags go by car with Lalamove or by courier, and the weight is worked out for you at checkout." },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  const options = [
    { Icon: Bike, title: "Same-day delivery", body: `${states || "Selangor & KL"}. Pay by ${cutoff}, Mon–Sat, and it arrives today by Lalamove.` },
    { Icon: Truck, title: "Courier, all Malaysia", body: "Sabah and Sarawak included. We book the courier from our shop and send you the tracking link." },
    { Icon: Store, title: "Free store pickup", body: `${site.address.street}, ${site.address.city}. ${site.hours.days}, ${site.hours.opens}–${site.hours.closes}.` },
  ];

  return (
    <div className="mx-auto grid max-w-3xl gap-8 px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="grid gap-3">
        <h1 className="font-bubble text-3xl font-extrabold text-choc sm:text-4xl">Pet food delivery in Rawang, Selangor &amp; KL</h1>
        <p className="text-lg text-choc-2">
          Cat food, dog food, treats and pet care from our pet shop in Bukit Beruntung, delivered the same day across Selangor and
          KL, or by courier anywhere in Malaysia.
        </p>
        {freeLine && <p className="w-fit rounded-full bg-peach px-4 py-1.5 text-sm font-bold text-choc">{freeLine}</p>}
      </header>

      <section aria-label="Delivery options" className="grid gap-3 sm:grid-cols-3">
        {options.map(({ Icon, title, body }) => (
          <div key={title} className="grid content-start gap-2 rounded-2xl card-soft bg-cream p-4">
            <Icon className="size-7 text-rust" aria-hidden />
            <h2 className="font-bold text-choc">{title}</h2>
            <p className="text-sm text-choc-2">{body}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="how-heading" className="grid gap-2">
        <h2 id="how-heading" className="flex items-center gap-2 font-bubble text-2xl font-extrabold text-choc">
          <Clock className="size-6 text-rust" aria-hidden /> How same-day works
        </h2>
        <ol className="grid list-decimal gap-1 pl-6 text-choc-2">
          <li>Add your pet&apos;s food to the cart and enter your postcode at checkout.</li>
          <li>Pick Lalamove delivery and pay online before {cutoff}.</li>
          <li>We pack it at the shop and a rider brings it to your door the same day.</li>
        </ol>
      </section>

      <section aria-labelledby="areas-heading" className="grid gap-2">
        <h2 id="areas-heading" className="flex items-center gap-2 font-bubble text-2xl font-extrabold text-choc">
          <PackageCheck className="size-6 text-rust" aria-hidden /> Areas we deliver to most
        </h2>
        <p className="text-choc-2">{AREAS.join(" · ")}, and the rest of the Klang Valley.</p>
      </section>

      <section aria-label="Shop" className="flex flex-wrap gap-2">
        {[
          ["/shop?pet=cat", "Cat food & care"],
          ["/shop?pet=dog", "Dog food & care"],
          ["/flea-tick", "NexGard by weight"],
          ["/shop?deal=short-dated", "Clearance deals"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full border-2 border-choc bg-terracotta px-4 py-2 text-sm font-bold text-cream">
            {label}
          </Link>
        ))}
      </section>

      <section aria-labelledby="faq-heading" className="grid gap-3">
        <h2 id="faq-heading" className="font-bubble text-2xl font-extrabold text-choc">Delivery questions</h2>
        {faq.map((f) => (
          <details key={f.q} className="rounded-2xl border-2 border-peach bg-cream p-4">
            <summary className="cursor-pointer font-bold text-choc">{f.q}</summary>
            <p className="mt-2 text-choc-2">{f.a}</p>
          </details>
        ))}
        <a href={whatsappLink("Hi Ria Pet Mart, can you deliver to my area today?")} target="_blank" rel="noopener noreferrer" className="w-fit font-bold text-rust underline">
          Ask us on WhatsApp
        </a>
      </section>
    </div>
  );
}
