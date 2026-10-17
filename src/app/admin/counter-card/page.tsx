import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { Panel } from "@/components/admin/dashboard-parts";
import { PageHeader } from "@/components/admin/list-parts";
import { PrintButton } from "@/components/admin/print-button";
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
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 print:max-w-none print:p-0">
      <PageHeader
        className="print:hidden"
        title="Counter card"
        sub={
          <>
            Print on A4 (4 cards a page), cut, and hand one with every counter sale. Scanning opens the website with the {offer.percent}% sign-up
            offer, and those orders show as source &quot;store&quot;.
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-3">Print cards: A4, 4 per page</span>
            <PrintButton />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
        {[0, 1, 2, 3].map((i) => (
          <section
            key={i}
            aria-label={`Counter card ${i + 1}`}
            className="relative grid break-inside-avoid grid-cols-[1fr_auto] items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-peach bg-cream p-5 pl-7 shadow-[var(--shadow-chunk)] print:rounded-none print:bg-surface print:shadow-none"
          >
            <span aria-hidden className="absolute inset-y-0 left-0 w-2 bg-rust" />
            <div className="grid gap-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-rust">{site.name}</p>
              <p className="font-bubble text-xl font-extrabold leading-tight text-choc">Next time, delivered today.</p>
              <p className="text-sm text-choc">
                The food you buy here, brought to your door. {offer.percent}% off your first online order when you sign up.
              </p>
              <p className="text-sm font-bold text-choc">{site.url.replace("https://", "")}</p>
              <p className="text-xs text-ink-2">WhatsApp {site.phone}</p>
            </div>
            <div
              className="w-28 rounded-xl bg-surface p-1.5 sm:w-32 lg:w-36 print:w-32 print:p-0"
              role="img"
              aria-label="QR code to riapetmart.com"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          </section>
        ))}
      </div>

      <div className="print:hidden">
        <Panel id="broadcast" title="WhatsApp broadcast to regulars" Icon={MessageCircle}>
          <p className="-mt-2 text-sm text-ink-2">Send from the shop&apos;s WhatsApp Business to customers who have messaged you before (broadcasts only reach people who saved your number).</p>
          <div className="grid gap-1.5">
            <label htmlFor="broadcast-text" className="text-sm font-semibold text-choc">Message to copy and send</label>
            <textarea
              id="broadcast-text"
              readOnly
              value={broadcast}
              rows={4}
              className="w-full rounded-xl border border-line bg-ground p-3 text-sm text-choc"
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
