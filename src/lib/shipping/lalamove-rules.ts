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

/** A booking that died on Lalamove's side can be booked again. */
export const LALAMOVE_REBOOKABLE = ["CANCELED", "REJECTED", "EXPIRED"];
