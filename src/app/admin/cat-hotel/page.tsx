import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireStaff } from "@/lib/auth";
import { updateCatHotelBookingStatus } from "../actions";

export const metadata: Metadata = { title: "Cat Hotel bookings", robots: { index: false } };

type Booking = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  cat_name: string | null;
  check_in: string;
  check_out: string;
  notes: string | null;
  status: "pending" | "confirmed" | "declined" | "completed";
  created_at: string;
};

const statusStyle: Record<Booking["status"], string> = {
  pending: "bg-warn-bg text-warn-fg",
  confirmed: "bg-ok-bg text-ok-fg",
  declined: "bg-bad-bg text-bad-fg",
  completed: "bg-sunk text-ink-2",
};

export default async function AdminCatHotelPage() {
  const { supabase, role } = await requireStaff();
  const { data } = await supabase
    .from("cat_hotel_bookings")
    .select("id, customer_name, customer_email, customer_phone, cat_name, check_in, check_out, notes, status, created_at")
    .order("check_in", { ascending: true });
  const bookings = (data ?? []) as Booking[];

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <AdminNav current="/admin/cat-hotel" role={role} />
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Cat Hotel bookings</h1>
        <p className="text-ink-2">Confirm or decline requests after checking real availability.</p>
      </div>

      {bookings.length === 0 ? (
        <p className="rounded-2xl border-2 border-line bg-surface p-6 text-ink-2">No booking requests yet.</p>
      ) : (
        <ul className="grid gap-3">
          {bookings.map((b) => (
            <li key={b.id} className="grid gap-2 rounded-2xl border-2 border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  {b.check_in} → {b.check_out}
                  {b.cat_name && ` · ${b.cat_name}`}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[b.status]}`}>{b.status}</span>
              </div>
              <p className="text-sm text-ink-2">
                {b.customer_name} · {b.customer_phone} · {b.customer_email}
              </p>
              {b.notes && <p className="text-sm text-ink-2">Notes: {b.notes}</p>}
              {b.status === "pending" && (
                <div className="flex gap-2">
                  <form action={updateCatHotelBookingStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value="confirmed" />
                    <button type="submit" className="min-h-9 rounded-full bg-ok-bg px-3 text-sm font-semibold text-ok-fg">
                      Confirm
                    </button>
                  </form>
                  <form action={updateCatHotelBookingStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value="declined" />
                    <button type="submit" className="min-h-9 rounded-full bg-bad-bg px-3 text-sm font-semibold text-bad-fg">
                      Decline
                    </button>
                  </form>
                </div>
              )}
              {b.status === "confirmed" && (
                <form action={updateCatHotelBookingStatus} className="w-fit">
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="status" value="completed" />
                  <button type="submit" className="min-h-9 rounded-full bg-sunk px-3 text-sm font-semibold text-ink-2">
                    Mark completed
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
