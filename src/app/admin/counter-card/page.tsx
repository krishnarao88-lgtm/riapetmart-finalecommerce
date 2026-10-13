import type { Metadata } from "next";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth";
import { site } from "@/lib/site";
import { getWelcomeOffer } from "@/lib/welcome-offer";

export const metadata: Metadata = { title: "Counter card", robots: { index: false } };

// Tagged so store customers who order online show up as "store" in each order's source.
const CARD_URL = `${site.url}/?offer=1&utm_source=store&utm_medium=counter_card`;

/** Printable card for every walk-in customer: brings store regulars to website delivery orders. */
export default async function CounterCardPage() {
  await requireAdmin();
  const [qr, offer] = await Promise.all([QRCode.toString(CARD_URL, { type: "svg", margin: 1 }), getWelcomeOffer()]);
  const broadcast = `Hi! Ria Pet Mart now delivers: order on ${site.url.replace("https://", "")} for same-day delivery in Selangor & KL (order before the daily cut-off), or courier anywhere in Malaysia. New here? Sign up on the site for ${offer.percent}% off your first online order: ${CARD_URL}`;

  return (
    <div className="grid gap-6">
      <header className="grid gap-1 print:hidden">
        <h1 className="text-2xl font-extrabold text-ink">Counter card</h1>
        <p className="text-sm text-ink-2">
          Print on A4 (4 cards a page), cut, and hand one with every counter sale. Scanning opens the website with the {offer.percent}% sign-up
          offer, and those orders show as source &quot;store&quot;.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
        {[0, 1, 2, 3].map((i) => (
          <section key={i} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border-2 border-dashed border-line bg-surface p-5 print:rounded-none">
            <div className="grid gap-1">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-2">{site.name}</p>
              <p className="text-xl font-extrabold leading-tight text-ink">Next time, delivered today.</p>
              <p className="text-sm text-ink">
                The food you buy here, brought to your door. {offer.percent}% off your first online order when you sign up.
              </p>
              <p className="text-sm font-bold text-ink">{site.url.replace("https://", "")}</p>
              <p className="text-xs text-ink-2">WhatsApp {site.phone}</p>
            </div>
            <div className="w-28" aria-label="QR code to riapetmart.com" dangerouslySetInnerHTML={{ __html: qr }} />
          </section>
        ))}
      </div>

      <section className="grid gap-2 rounded-2xl border-2 border-line bg-surface p-4 print:hidden">
        <h2 className="font-extrabold text-ink">WhatsApp broadcast to regulars</h2>
        <p className="text-sm text-ink-2">Send from the shop&apos;s WhatsApp Business to customers who have messaged you before (broadcasts only reach people who saved your number).</p>
        <textarea readOnly value={broadcast} rows={4} className="w-full rounded-xl border border-line p-3 text-sm" aria-label="Broadcast message" />
      </section>
    </div>
  );
}
