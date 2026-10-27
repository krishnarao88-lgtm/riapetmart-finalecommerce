// Cat Hotel estimate (owner's rules, 27 Oct 2026). Pure maths so the booking form, the server check and Admin agree.
// - RM10 per cat per day; food and litter come from the customer.
// - Every calendar day between check-in and check-out counts, Sundays included (the shop is closed for
//   check-in/check-out on Sunday, but a cat staying over Sunday is boarding that day).
// - Check-out is before 12pm; collecting after 12pm adds one more day.
export const CAT_HOTEL_RATE = 10;
export const LATE_CHECKOUT_NOTE = "Check-out after 12pm";

export type CatHotelQuote = { ok: true; days: number; lateDay: boolean; total: number } | { ok: false; error: string };

const DAY = 86_400_000;
const parse = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? Date.parse(`${d}T00:00:00Z`) : NaN);
const isSunday = (t: number) => new Date(t).getUTCDay() === 0;

export function catHotelQuote(checkIn: string, checkOut: string, cats: number, lateCheckout: boolean): CatHotelQuote {
  const inAt = parse(checkIn);
  const outAt = parse(checkOut);
  if (Number.isNaN(inAt) || Number.isNaN(outAt)) return { ok: false, error: "Choose your check-in and check-out dates." };
  if (outAt < inAt) return { ok: false, error: "Check-out must be on or after check-in." };
  if (isSunday(inAt) || isSunday(outAt)) return { ok: false, error: "We're closed on Sundays. Please check in and out Monday–Saturday." };
  const n = Math.min(10, Math.max(1, Math.floor(cats) || 1));
  // A same-day drop-off and pick-up still counts as one day.
  const days = Math.max(1, Math.round((outAt - inAt) / DAY)) + (lateCheckout ? 1 : 0);
  return { ok: true, days, lateDay: lateCheckout, total: days * n * CAT_HOTEL_RATE };
}
