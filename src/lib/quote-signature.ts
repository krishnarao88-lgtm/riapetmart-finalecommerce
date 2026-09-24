import { createHmac, timingSafeEqual } from "node:crypto";

export type QuoteFields = { method: string; price: number; serviceId?: string; postcode: string; subtotal: number };
export type QuoteSignature = { expires: number; sig: string };

const TTL_MS = 30 * 60 * 1000;

export function quoteSecret(): string {
  const secret = process.env.SHIPPING_QUOTE_SECRET ?? process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("SHIPPING_QUOTE_SECRET (or STRIPE_SECRET_KEY) is not set");
  return secret;
}

function hmac(q: QuoteFields, expires: number, secret: string): Buffer {
  const payload = JSON.stringify([
    "shipping-quote",
    q.method,
    q.price.toFixed(2),
    q.serviceId ?? "",
    q.postcode.trim(),
    q.subtotal.toFixed(2),
    expires,
  ]);
  return createHmac("sha256", secret).update(payload).digest();
}

export function signQuote(q: QuoteFields, secret: string, now = Date.now()): QuoteSignature {
  const expires = now + TTL_MS;
  return { expires, sig: hmac(q, expires, secret).toString("hex") };
}

export function verifyQuote(q: QuoteFields, s: Partial<QuoteSignature>, secret: string, now = Date.now()): boolean {
  if (typeof s.expires !== "number" || typeof s.sig !== "string" || s.expires < now) return false;
  if (!Number.isFinite(q.price) || !Number.isFinite(q.subtotal)) return false;
  const expected = hmac(q, s.expires, secret);
  const received = Buffer.from(s.sig, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
