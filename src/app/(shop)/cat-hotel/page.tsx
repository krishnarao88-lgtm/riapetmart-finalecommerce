import Image from "next/image";
import type { Metadata } from "next";
import { submitCatHotelBooking } from "./actions";
import { StayFields } from "./stay-fields";

export const metadata: Metadata = {
  title: "Cat Hotel Rawang – Book Cat Boarding Online",
  description:
    "Cat hotel in Rawang at Ria Pet Mart, Bandar Bukit Beruntung. RM10 per cat per day. Request your cat boarding dates online and we confirm on WhatsApp.",
  alternates: { canonical: "/cat-hotel" },
};

export default async function CatHotelPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const { submitted, error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto grid max-w-3xl gap-8 px-4 py-10 md:grid-cols-2 md:items-start">
      <div className="grid gap-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border-2 border-choc shadow-[5px_5px_0_0_var(--color-choc)]">
          <Image
            src="/images/shop/storefront-cathotel.jpg"
            alt="Ria Pet Mart Cat Hotel signage"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        </div>
        <div className="grid gap-1">
          <h1 className="font-bubble text-3xl font-extrabold text-choc">Cat Hotel in Rawang: book cat boarding</h1>
          <p className="text-choc-2">
            Boarding for your cat while you&apos;re away, right here at our Bandar Bukit Beruntung shop. Submit a
            request below and we&apos;ll confirm availability with you on WhatsApp or phone.
          </p>
          <ul className="grid list-disc gap-1 pl-5 text-sm text-choc-2">
            <li>RM10 per cat per day. The form works out your estimate.</li>
            <li>Please bring your cat&apos;s own food and litter. We don&apos;t provide them.</li>
            <li>Check-in and check-out Monday–Saturday (we&apos;re closed Sundays). A stay over Sunday counts as a day.</li>
            <li>Check-out is before 12pm. Pick-up after 12pm is charged one extra day.</li>
          </ul>
          <p className="text-sm text-choc-2">
            This is a booking <strong>request</strong>, not an instant confirmation — we check space before
            confirming.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {submitted && (
          <p className="rounded-xl border-2 border-ok-fg bg-ok-bg px-3 py-2 text-sm text-ok-fg">
            Thanks! We&apos;ve received your request and will confirm with you shortly.
          </p>
        )}
        {error && (
          <p className="rounded-xl border-2 border-bad-fg bg-bad-bg px-3 py-2 text-sm text-bad-fg">
            {error === "sunday"
              ? "We're closed on Sundays. Please choose a Monday–Saturday check-in and check-out."
              : "Please fill in your name, contact details, and check-in/check-out dates."}
          </p>
        )}

        <form action={submitCatHotelBooking} className="grid gap-4 rounded-2xl card-soft bg-surface p-5">
          <label className="grid gap-1 text-sm font-semibold text-choc">
            Your name
            <input
              name="customer_name"
              required
              className="rounded-xl border border-choc/30 bg-cream px-3 py-2 text-base font-normal text-choc"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-choc">
              Email
              <input
                type="email"
                name="customer_email"
                required
                className="w-full min-w-0 rounded-xl border border-choc/30 bg-cream px-3 py-2 text-base font-normal text-choc"
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-choc">
              Phone / WhatsApp
              <input
                type="tel"
                name="customer_phone"
                required
                className="w-full min-w-0 rounded-xl border border-choc/30 bg-cream px-3 py-2 text-base font-normal text-choc"
              />
            </label>
          </div>

          <label className="grid min-w-0 gap-1 text-sm font-semibold text-choc">
            Cat&apos;s name(s) (optional)
            <input
              name="cat_name"
              placeholder="e.g. Milo, Luna"
              className="w-full min-w-0 rounded-xl border border-choc/30 bg-cream px-3 py-2 text-base font-normal text-choc"
            />
          </label>

          <StayFields today={today} />

          <label className="grid gap-1 text-sm font-semibold text-choc">
            Notes (optional)
            <textarea
              name="notes"
              rows={3}
              placeholder="Feeding schedule, medication, temperament, etc."
              className="rounded-xl border border-choc/30 bg-cream px-3 py-2 text-base font-normal text-choc"
            />
          </label>

          <button type="submit" className="btn-bubble bg-terracotta text-cream">
            Request booking on WhatsApp
          </button>
          <p className="text-xs text-choc-2">WhatsApp opens with your booking summary ready. Just tap send.</p>
        </form>
      </div>
    </div>
  );
}
