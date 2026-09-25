import Image from "next/image";
import { whatsappLink, site } from "@/lib/site";

export const metadata = {
  title: "About us",
  description:
    "Ria Pet Mart has served Bandar Bukit Beruntung since 2016 as the area's first pet shop — quality food, treats, healthcare and daily essentials for dogs, cats and small pets.",
  alternates: { canonical: "/about" },
};

const offerings = [
  "Quality dog and cat food",
  "Treats and dental care products",
  "Pet supplements and healthcare essentials",
  "Grooming and hygiene products",
  "Toys, accessories and daily necessities",
  "Veterinary-related support and pet-care guidance",
  "Convenient in-store and online shopping",
];

const whyUs = [
  "Friendly and helpful service",
  "Practical advice for everyday pet care",
  "Affordable prices and great-value products",
  "A convenient local location in Bukit Beruntung",
  "Carefully selected pet food and healthcare brands",
  "Online ordering for easier shopping",
  "Support for pets at every stage of life",
];

const photoCard =
  "overflow-hidden rounded-3xl border-2 border-choc shadow-[5px_5px_0_0_var(--color-choc)]";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="grid gap-3">
          <h1 className="font-bubble text-4xl font-extrabold text-choc">More than a pet shop</h1>
          <p className="text-lg font-medium text-choc-2">We&apos;re part of your pet&apos;s family.</p>
          <p className="text-choc-2">
            Welcome to {site.name}, your friendly neighbourhood pet shop in Bandar Bukit Beruntung, Rawang.
            Since 2016 — the first pet shop to open in the area — we&apos;ve been helping pet parents find the
            right food, treats, healthcare products and everyday essentials for their dogs, cats and other
            animal companions.
          </p>
        </div>
        <div className={`relative aspect-[4/3] ${photoCard}`}>
          <Image
            src="/images/shop/storefront-signage.jpg"
            alt="Ria Pet Mart shopfront signage, Bandar Bukit Beruntung"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        </div>
      </div>

      <p className="mt-6 text-choc-2">
        Whether you&apos;re welcoming a new puppy or kitten, caring for a senior pet, or simply looking for
        better nutrition and daily care products, our goal is to make pet care easier, more affordable and more
        enjoyable for every family.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2 md:items-center">
        <div className={`relative aspect-[4/3] order-2 md:order-1 ${photoCard}`}>
          <Image
            src="/images/shop/dog-food-shelves.jpg"
            alt="Dog food shelves stocked at Ria Pet Mart"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        </div>
        <div className="order-1 grid gap-2 md:order-2">
          <h2 className="font-bubble text-2xl font-extrabold text-choc">What we offer</h2>
          <ul className="grid gap-1.5 text-choc-2">
            {offerings.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 md:items-center">
        <div className="grid gap-2">
          <h2 className="font-bubble text-2xl font-extrabold text-choc">Why pet parents choose us</h2>
          <p className="text-choc-2">
            We believe every pet deserves good care, proper nutrition and lots of love. Our team is here to
            help you choose products that suit your pet&apos;s needs, lifestyle and budget. Rated{" "}
            {site.google.rating}★ from {site.google.reviewCount} Google reviews, we&apos;re proud to be the pet
            shop locals in Bandar Bukit Beruntung and Rawang keep coming back to — known locally as kedai
            haiwan Rawang and kedai haiwan Bukit Beruntung.
          </p>
          <ul className="mt-1 grid gap-1.5 text-choc-2">
            {whyUs.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className={`relative aspect-[4/3] ${photoCard}`}>
          <Image
            src="/images/shop/cat-food-shelves.jpg"
            alt="Cat food shelves stocked at Ria Pet Mart"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 md:items-center">
        <div className={`relative aspect-[4/3] order-2 md:order-1 ${photoCard}`}>
          <Image
            src="/images/shop/storefront-cathotel.jpg"
            alt="Ria Pet Mart cat hotel boarding service signage"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        </div>
        <div className="order-1 grid gap-2 md:order-2">
          <h2 className="font-bubble text-2xl font-extrabold text-choc">Beyond the shelves</h2>
          <p className="text-choc-2">
            Alongside our retail shop, we run a panel clinic, All Animal Health Clinic, and offer cat boarding
            (Cat Hotel) and grooming — so pets can get food, supplies, care and a place to stay without a trip
            across town. Ask in-store or on WhatsApp for current rates and availability.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-4 rounded-3xl border-2 border-choc bg-peach/40 p-6 sm:p-8">
        <h2 className="font-bubble text-2xl font-extrabold text-choc">The fun part</h2>
        <p className="text-choc-2">
          From playful puppies and curious kittens to loyal seniors, every pet has its own personality — and we
          love being part of their journey. Come in for the essentials, stay for the friendly advice, and leave
          with something your pet will love.
        </p>
        <div className={`relative aspect-video ${photoCard}`}>
          <Image
            src="/images/shop/treats-display.jpg"
            alt="Wall of dog and cat treats at Ria Pet Mart"
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-cover"
          />
        </div>
      </div>

      <div className="mt-10 grid gap-3 text-center">
        <h2 className="font-bubble text-2xl font-extrabold text-choc">Let&apos;s take better care of your pets, together</h2>
        <p className="mx-auto max-w-xl text-choc-2">
          Looking for the right food, supplement, treat or pet-care product? Visit us in Bandar Bukit
          Beruntung, send an enquiry, or contact us on WhatsApp — we&apos;re always happy to help you find the
          best choice for your furry family member.
        </p>
        <p className="text-sm text-choc-2">
          Open {site.hours.days}, {site.hours.opens}–{site.hours.closes}. Closed {site.hours.closed}.
        </p>
        <div className="mx-auto flex flex-wrap justify-center gap-3">
          <a
            href={site.google.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-bubble bg-terracotta px-6 py-3 text-cream"
          >
            See our Google reviews
          </a>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn-bubble bg-rust px-6 py-3 text-cream">
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
