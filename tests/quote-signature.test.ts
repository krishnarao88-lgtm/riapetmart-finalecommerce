import assert from "node:assert/strict";
import { test } from "node:test";
import { signQuote, verifyQuote } from "../src/lib/quote-signature.ts";

const secret = "test-secret";
const now = 1_800_000_000_000;
const quote = { method: "easyparcel", price: 12.5, serviceId: "EP-123", postcode: "48300", subtotal: 88.9 };

test("a freshly signed quote verifies", () => {
  assert.equal(verifyQuote(quote, signQuote(quote, secret, now), secret, now + 60_000), true);
});

test("tampering with any signed field fails", () => {
  const s = signQuote(quote, secret, now);
  assert.equal(verifyQuote({ ...quote, price: 0.01 }, s, secret, now), false);
  assert.equal(verifyQuote({ ...quote, method: "lalamove" }, s, secret, now), false);
  assert.equal(verifyQuote({ ...quote, serviceId: "EP-999" }, s, secret, now), false);
  assert.equal(verifyQuote({ ...quote, postcode: "88000" }, s, secret, now), false);
  assert.equal(verifyQuote({ ...quote, subtotal: 20 }, s, secret, now), false);
  assert.equal(verifyQuote(quote, { ...s, expires: s.expires + 1 }, secret, now), false);
});

test("wrong secret, expired, or malformed signatures fail", () => {
  const s = signQuote(quote, secret, now);
  assert.equal(verifyQuote(quote, s, "other-secret", now), false);
  assert.equal(verifyQuote(quote, s, secret, now + 31 * 60_000), false);
  assert.equal(verifyQuote(quote, { expires: s.expires, sig: "abc" }, secret, now), false);
  assert.equal(verifyQuote(quote, {}, secret, now), false);
});
