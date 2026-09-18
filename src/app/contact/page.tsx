import { MapPin, MessageCircle, Phone } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";

export const metadata = { title: "Contact us" };

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
          className="flex items-center gap-3 rounded-2xl border-2 border-choc bg-surface p-4 font-semibold text-choc"
        >
          <Phone className="size-5 text-rust" aria-hidden />
          {site.phone}
        </a>

        <a
          href={site.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-2xl border-2 border-choc bg-surface p-4 text-choc"
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
      </div>
    </div>
  );
}
