import { ArrowRight, CalendarCheck, Cat, Check, Clock, Mail, MessageCircle, Phone, X } from "lucide-react";
import type { Metadata } from "next";
import { actionBtn, CountTile, EmptyState, PageHeader, Pill, TONE } from "@/components/admin/list-parts";
import { requireStaff } from "@/lib/auth";
import { catHotelQuote, LATE_CHECKOUT_NOTE } from "@/lib/cat-hotel-price";
import { updateCatHotelBookingStatus } from "../actions";

export const metadata: Metadata = { title: "Cat Hotel bookings", robots: { index: false } };

type Booking = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  cat_name: string | null;
  pet_count: number;
  check_in: string;
  check_out: string;
  notes: string | null;
  status: "pending" | "confirmed" | "declined" | "completed";
  created_at: string;
};

/** Opens WhatsApp to the customer (Malaysian 01x… → 601x…) with a reply that matches the booking's status. */
function customerWhatsapp(b: Booking) {
  const digits = b.customer_phone.replace(/\D/g, "").replace(/^0/, "60");
  const dates = `${b.check_in} to ${b.check_out}`;
  const text =
    b.status === "confirmed"
      ? `Hi ${b.customer_name}, your Cat Hotel stay at Ria Pet Mart (${dates}) is confirmed. Please bring food, any medication and the vaccination record. See you!`
      : b.status === "declined"
        ? `Hi ${b.customer_name}, sorry, the Cat Hotel is full for ${dates}. Can we suggest other dates?`
        : `Hi ${b.customer_name}, thanks for your Cat Hotel request (${dates}) at Ria Pet Mart.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

const statusTone ={ pending: "warn", confirmed: "ok", declined: "bad", completed: "muted" } as const satisfies Record<Booking["status"], keyof typeof TONE>;

export default async function AdminCatHotelPage() {
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("cat_hotel_bookings")
    .select("id, customer_name, customer_email, customer_phone, cat_name, pet_count, check_in, check_out, notes, status, created_at")
    .order("check_in", { ascending: true });
  const bookings = (data ?? []) as Booking[];
  const count = (s: Booking["status"]) => bookings.filter((b) => b.status === s).length;

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6">
      <PageHeader title="Cat Hotel bookings" sub="Confirm or decline requests after checking real availability." />

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CountTile label="Pending" value={count("pending")} note="Needs a reply" Icon={Clock} chip={TONE.warn} />
        <CountTile label="Confirmed" value={count("confirmed")} note="Booked in" Icon={CalendarCheck} chip={TONE.ok} />
        <CountTile label="Completed" value={count("completed")} note="Stay finished" Icon={Check} chip={TONE.muted} />
        <CountTile label="Declined" value={count("declined")} note="Not taken" Icon={X} chip={TONE.bad} />
      </ul>

      {bookings.length === 0 ? (
        <EmptyState Icon={Cat}>No booking requests yet.</EmptyState>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {bookings.map((b) => (
            <li key={b.id} className="grid content-start gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-chunk)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid gap-0.5">
                  <span className="font-bubble text-lg font-extrabold text-choc">
                    {b.pet_count} cat{b.pet_count > 1 ? "s" : ""}
                    {b.cat_name && ` (${b.cat_name})`}
                  </span>
                  <span className="text-sm font-semibold text-ink-2">{b.customer_name}</span>
                </div>
                <Pill tone={statusTone[b.status]}>{b.status}</Pill>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-cream p-3">
                <div className="grid">
                  <span className="text-xs font-semibold text-ink-3">Check-in</span>
                  <span className="font-bold tabular-nums text-choc">{b.check_in}</span>
                </div>
                <ArrowRight className="size-4 text-rust" aria-hidden />
                <div className="grid text-right">
                  <span className="text-xs font-semibold text-ink-3">Check-out</span>
                  <span className="font-bold tabular-nums text-choc">{b.check_out}</span>
                </div>
              </div>

              {(() => {
                const q = catHotelQuote(b.check_in, b.check_out, b.pet_count, !!b.notes?.includes(LATE_CHECKOUT_NOTE));
                return q.ok ? (
                  <p className="text-sm font-semibold text-choc">
                    Estimate RM{q.total} · {q.days} day{q.days > 1 ? "s" : ""} × {b.pet_count} cat{b.pet_count > 1 ? "s" : ""}
                    {q.lateDay && " (incl. late pick-up)"}
                  </p>
                ) : null;
              })()}

              <div className="grid gap-1 text-sm text-ink-2">
                <span className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0 text-ink-3" aria-hidden />
                  {b.customer_phone}
                  <a
                    href={customerWhatsapp(b)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 rounded-full bg-ok-bg px-3 py-1 text-xs font-bold text-ok-fg"
                  >
                    <MessageCircle className="size-3.5" aria-hidden /> WhatsApp
                  </a>
                </span>
                <span className="flex items-center gap-2 break-all"><Mail className="size-4 shrink-0 text-ink-3" aria-hidden />{b.customer_email}</span>
                {b.notes && <p className="mt-1 rounded-xl bg-sunk px-3 py-2">Notes: {b.notes}</p>}
              </div>

              {b.status === "pending" && (
                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  <form action={updateCatHotelBookingStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value="confirmed" />
                    <button type="submit" className={actionBtn.yes}>
                      <Check className="size-4" aria-hidden /> Confirm
                    </button>
                  </form>
                  <form action={updateCatHotelBookingStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value="declined" />
                    <button type="submit" className={actionBtn.no}>
                      <X className="size-4" aria-hidden /> Decline
                    </button>
                  </form>
                </div>
              )}
              {b.status === "confirmed" && (
                <form action={updateCatHotelBookingStatus} className="border-t border-line pt-3">
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="status" value="completed" />
                  <button type="submit" className={actionBtn.quiet}>
                    <CalendarCheck className="size-4" aria-hidden /> Mark completed
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
