import { site } from "@/lib/site";

export const metadata = {
  title: "About us",
  description: "Ria Pet Mart has served Bandar Bukit Beruntung for 16 years as the area's first pet shop, alongside our panel clinic, All Animal Health Clinic.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">About {site.name}</h1>
      <div className="mt-6 grid gap-4 text-choc-2">
        <p>
          {site.name} has been serving Bandar Bukit Beruntung for 16 years — the first pet shop to open in the
          area. What started as a small neighbourhood shop has grown into a full pet care destination for
          {" "}{site.address.city} and the surrounding Klang Valley.
        </p>
        <p>
          Alongside our shop, we run a panel clinic, All Animal Health Clinic, so pets can get food, supplies
          and veterinary care without a trip across town.
        </p>
        <p>
          Today we stock food, treats, grooming and health supplies for dogs, cats and small pets, with
          same-day delivery in the Klang Valley, nationwide courier and free store pickup.
        </p>
        <p>
          Rated {site.google.rating}★ from {site.google.reviewCount} Google reviews, we&apos;re proud to be
          the pet shop locals in Bandar Bukit Beruntung and Rawang keep coming back to — known locally as
          kedai haiwan Rawang and kedai haiwan Bukit Beruntung.
        </p>
        <p>
          Open {site.hours.days}, {site.hours.opens}–{site.hours.closes}. Closed {site.hours.closed}.
        </p>
      </div>
      <a
        href={site.google.url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-bubble mt-6 inline-flex bg-terracotta px-6 py-3 text-cream"
      >
        See our Google reviews
      </a>
    </div>
  );
}
