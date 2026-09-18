import { site } from "@/lib/site";

export const metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">About {site.name}</h1>
      <div className="mt-6 grid gap-4 text-choc-2">
        <p>
          {site.name} is a neighbourhood pet shop in {site.address.city}, {site.address.state}, stocking
          food, treats, grooming and health supplies for dogs, cats and small pets.
        </p>
        <p>
          Rated {site.google.rating}★ from {site.google.reviewCount} Google reviews, we&apos;re proud to be
          the pet shop locals in Bandar Bukit Beruntung and Rawang keep coming back to.
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
