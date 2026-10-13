import { Clock, MapPin, Phone, Star, Stethoscope } from "lucide-react";

// Our own vet clinic, a few doors from the shop. Facts copied from its Google Business Profile (13 Oct 2026); update
// the rating here when it changes. Reviews and photos stay on Google: we link to them rather than copying them.
export const partnerClinic = {
  name: "Animal Health Clinic (Klinik Kesihatan Haiwan)",
  street: "G9, Jalan Trompet 14, Seksyen BB7, Bandar Bukit Beruntung",
  postcode: "48300",
  city: "Rawang",
  state: "Selangor",
  phone: "+60 18-232 2014",
  tel: "+60182322014",
  hours: "Monday–Saturday, 9:30am–6pm",
  rating: 4.5,
  reviewCount: 140,
  googleUrl: "https://share.google/owkRoOLWMb70rKw4X",
  services: "Consultations, vaccinations, surgery and pet wards for cats, dogs and small animals.",
};

const c = partnerClinic;
const query = encodeURIComponent(`${c.name}, ${c.street}, ${c.postcode} ${c.city}`);

/** VeterinaryCare structured data, so "klinik haiwan near me" searches can match the clinic to this page. */
export function partnerClinicJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "VeterinaryCare",
    name: c.name,
    telephone: c.tel,
    address: { "@type": "PostalAddress", streetAddress: c.street, postalCode: c.postcode, addressLocality: c.city, addressRegion: c.state, addressCountry: "MY" },
    openingHours: "Mo-Sa 09:30-18:00",
    aggregateRating: { "@type": "AggregateRating", ratingValue: c.rating, reviewCount: c.reviewCount },
  };
}

export function PartnerClinic() {
  return (
    <section id="partner-clinic" aria-labelledby="partner-clinic-heading" className="grid gap-4 rounded-3xl card-soft bg-peach/30 p-5 sm:p-6">
      <div className="grid gap-1">
        <p className="text-sm font-bold uppercase tracking-wide text-rust">Our partner clinic</p>
        <h2 id="partner-clinic-heading" className="flex items-center gap-2 font-bubble text-2xl font-extrabold text-choc">
          <Stethoscope className="size-6 text-rust" aria-hidden /> {c.name}
        </h2>
        <a href={c.googleUrl} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-choc">
          <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
          {c.rating} on Google · {c.reviewCount} reviews
          <span className="text-rust underline">Read the reviews</span>
        </a>
      </div>
      <p className="text-choc-2">
        Our own vet clinic in Bukit Beruntung, a short walk from Ria Pet Mart. {c.services} Need food, NexGard or supplements
        after a visit? Pick them up at our shop next door or get them delivered today.
      </p>
      <p lang="ms" className="text-sm text-choc-2">
        Klinik haiwan di Bukit Beruntung, Rawang: rawatan, vaksin, pembedahan dan wad haiwan untuk kucing dan anjing.
      </p>
      <ul className="grid gap-1.5 text-sm text-choc">
        <li className="flex gap-2"><MapPin className="size-4 shrink-0 text-rust" aria-hidden />{c.street}, {c.postcode} {c.city}, {c.state}</li>
        <li className="flex gap-2"><Clock className="size-4 shrink-0 text-rust" aria-hidden />{c.hours}</li>
        <li className="flex gap-2"><Phone className="size-4 shrink-0 text-rust" aria-hidden />{c.phone}</li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <a href={`tel:${c.tel}`} className="btn-bubble bg-rust px-4 py-2 text-sm text-cream">Call the clinic</a>
        <a href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noopener noreferrer" className="btn-bubble bg-surface px-4 py-2 text-sm text-choc">
          Directions
        </a>
        <a href={c.googleUrl} target="_blank" rel="noopener noreferrer" className="btn-bubble bg-surface px-4 py-2 text-sm text-choc">
          Photos &amp; reviews on Google
        </a>
      </div>
      <iframe
        title={`Map: ${c.name}`}
        src={`https://www.google.com/maps?q=${query}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-64 w-full rounded-2xl border-0"
      />
    </section>
  );
}
