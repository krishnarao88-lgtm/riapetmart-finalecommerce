import { MapPin, Stethoscope, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { VetFinderButton } from "@/components/vet-finder-button";
import { whatsappLink } from "@/lib/site";

export const metadata = {
  title: "Find a vet near you: Rawang, Selangor & KL",
  description:
    "Find vet clinics near you in Rawang, Bukit Beruntung, Selayang, Kepong and across the Klang Valley. One tap opens Google Maps with clinics, ratings, opening hours and directions.",
  alternates: { canonical: "/vets" },
};

// Areas our customers come from; each opens a Google Maps search for vets there (no location needed).
const AREAS = [
  "Bukit Beruntung",
  "Rawang",
  "Kuang",
  "Serendah",
  "Batang Kali",
  "Selayang",
  "Kepong",
  "Sungai Buloh",
  "Batu Caves",
  "Kuala Lumpur",
  "Petaling Jaya",
  "Shah Alam",
];
const mapsFor = (area: string) => `https://www.google.com/maps/search/${encodeURIComponent(`veterinary clinic ${area}`)}`;

export default function VetsPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-8 px-4 py-10">
      <header className="grid gap-3">
        <h1 className="flex items-center gap-3 font-bubble text-3xl font-extrabold text-choc sm:text-4xl">
          <Stethoscope className="size-8 text-rust" aria-hidden /> Find a vet near you
        </h1>
        <p className="text-lg text-choc-2">
          One tap opens Google Maps with the vet clinics around you, with ratings, opening hours, phone numbers and
          directions. Your location goes straight to Google Maps; we never see or keep it.
        </p>
        <VetFinderButton className="w-fit" />
      </header>

      <section aria-labelledby="urgent-heading" className="grid gap-2 rounded-2xl bg-bad-bg p-4 text-bad-fg">
        <h2 id="urgent-heading" className="flex items-center gap-2 font-bold">
          <TriangleAlert className="size-5" aria-hidden /> Call a vet straight away if your pet
        </h2>
        <ul className="grid list-disc gap-1 pl-6 text-sm">
          <li>has trouble breathing, collapses or has a seizure</li>
          <li>may have eaten poison, medicine, chocolate, lilies or something sharp</li>
          <li>is bleeding heavily or was hit by a vehicle</li>
          <li>keeps vomiting, has bloody diarrhoea or hasn&apos;t eaten for more than a day</li>
          <li>(cats) is straining in the litter box and passing little or no urine</li>
        </ul>
        <p className="text-xs">This is general guidance, not a diagnosis. When in doubt, phone the clinic first.</p>
      </section>

      <section aria-labelledby="areas-heading" className="grid gap-3">
        <h2 id="areas-heading" className="font-bubble text-2xl font-extrabold text-choc">
          Vet clinics by area
        </h2>
        <p className="text-sm text-choc-2">Prefer not to share your location? Pick your area instead.</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AREAS.map((area) => (
            <li key={area}>
              <a
                href={mapsFor(area)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl card-soft bg-cream px-3 py-2.5 text-sm font-semibold text-choc hover:bg-peach/40"
              >
                <MapPin className="size-4 shrink-0 text-rust" aria-hidden /> Vets in {area}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-2 rounded-2xl card-soft bg-peach/30 p-5 text-choc">
        <h2 className="font-bold">After the vet visit</h2>
        <p className="text-sm text-choc-2">
          Got a diet or supplement recommendation? We stock vet-approved food, supplements and care products at our
          shop in Bukit Beruntung, with same-day delivery around Selangor and KL.
        </p>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/shop?category=supplements" className="underline hover:text-rust">
            Supplements &amp; health care
          </Link>
          <a
            href={whatsappLink("Hi Ria Pet Mart, my vet recommended something for my pet. Do you have it?")}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-rust"
          >
            WhatsApp us your vet&apos;s list
          </a>
        </div>
      </section>
    </div>
  );
}
