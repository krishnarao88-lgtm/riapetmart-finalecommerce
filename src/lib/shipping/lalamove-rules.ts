/** Malaysian numbers to the E.164 form Lalamove requires: "012-345 6789" -> "+60123456789". */
export function toE164MY(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("60") ? digits.slice(2) : digits.replace(/^0/, "");
  return /^1\d{7,9}$/.test(national) ? `+60${national}` : null;
}

/** Rider status -> our fulfilment step. Failed bookings (cancelled/rejected/expired) change nothing: the admin rebooks. */
export function fulfilmentForLalamove(status: string): "packed" | "shipped" | "delivered" | null {
  if (status === "ASSIGNING_DRIVER" || status === "ON_GOING") return "packed";
  if (status === "PICKED_UP") return "shipped";
  if (status === "COMPLETED") return "delivered";
  return null;
}

/** Owner's same-day cut-off (29 Sep 2026): paid by 1pm Malaysia time, Mon–Sat. The shop is closed Sundays. */
export const SAME_DAY_CUTOFF_HOUR = 13;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * What Lalamove delivery promises right now. Before the cut-off it's same-day with the guarantee
 * (delivery fee refunded if it doesn't arrive today); otherwise it arrives on the next shop day.
 */
export function lalamoveDelivery(now = new Date()) {
  const my = new Date(now.getTime() + 8 * 3_600_000); // read UTC fields as Malaysia time
  const day = my.getUTCDay();
  if (day !== 0 && my.getUTCHours() < SAME_DAY_CUTOFF_HOUR) {
    return { sameDay: true, label: "Same-day delivery (Lalamove) · arrives today, or your delivery fee back", short: "Same-day delivery (Lalamove)" };
  }
  let next = (day + 1) % 7;
  if (next === 0) next = 1; // no Sunday deliveries
  const when = next === (day + 1) % 7 ? "tomorrow" : DAYS[next];
  return {
    sameDay: false,
    label: `Lalamove delivery · arrives ${when} (same-day cut-off is 1pm)`,
    short: `Lalamove delivery (arrives ${when})`,
  };
}

/** A booking that died on Lalamove's side can be booked again. */
export const LALAMOVE_REBOOKABLE = ["CANCELED", "REJECTED", "EXPIRED"];
