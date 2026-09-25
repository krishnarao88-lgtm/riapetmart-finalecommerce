import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { EnquiryForm } from "@/components/enquiry-form";
import { site, whatsappLink } from "@/lib/site";

export const metadata = {
  title: "Contact us",
  description: "Reach Ria Pet Mart by WhatsApp, phone or email, or send us an enquiry directly.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">Contact us</h1>
      <p className="mt-2 text-choc-2">
        Questions about an order, stock or delivery? We&apos;re quickest to reach on WhatsApp.
      </p>

      <div className="mt-6 grid gap-3">
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-bubble bg-terracotta px-6 py-3 text-cream"
        >
          <MessageCircle className="size-5" aria-hidden />
          WhatsApp us now
        </a>

        <a
          href={`tel:${site.phone.replace(/\s+/g, "")}`}
          className="flex items-center gap-3 rounded-2xl card-soft bg-surface p-4 font-semibold text-choc"
        >
          <Phone className="size-5 text-rust" aria-hidden />
          {site.phone}
        </a>

        <a
          href={`mailto:${site.email}`}
          className="flex items-center gap-3 rounded-2xl card-soft bg-surface p-4 font-semibold text-choc"
        >
          <Mail className="size-5 text-rust" aria-hidden />
          {site.email}
        </a>

        <a
          href={site.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-2xl card-soft bg-surface p-4 text-choc"
        >
          <MapPin className="mt-0.5 size-5 shrink-0 text-rust" aria-hidden />
          <span>
            {site.address.street}, {site.address.city}, {site.address.postcode} {site.address.state}
            <br />
            <span className="text-sm text-choc-2">
              Open {site.hours.days}, {site.hours.opens}–{site.hours.closes}
            </span>
          </span>
        </a>

        <iframe
          title="Ria Pet Mart location"
          src={`https://www.google.com/maps?q=${site.geo.lat},${site.geo.lng}&z=16&output=embed`}
          className="h-64 w-full rounded-2xl card-soft"
          loading="lazy"
        />
      </div>

      <h2 className="mt-10 font-bubble text-2xl font-extrabold text-choc">Send us an enquiry</h2>
      <div className="mt-4">
        <EnquiryForm />
      </div>
    </div>
  );
}
