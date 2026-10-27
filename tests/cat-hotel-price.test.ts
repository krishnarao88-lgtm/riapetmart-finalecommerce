import assert from "node:assert/strict";
import { test } from "node:test";
import { catHotelQuote } from "../src/lib/cat-hotel-price.ts";

test("Cat Hotel: RM10 per cat per day, Sundays in a stay count", () => {
  // Sat 31 Oct 2026 → Mon 2 Nov 2026: Sat, Sun = 2 days
  assert.deepEqual(catHotelQuote("2026-10-31", "2026-11-02", 1, false), { ok: true, days: 2, lateDay: false, total: 20 });
  assert.deepEqual(catHotelQuote("2026-10-31", "2026-11-02", 2, false), { ok: true, days: 2, lateDay: false, total: 40 });
});

test("Cat Hotel: check-out after 12pm adds a day; same day counts as one", () => {
  assert.deepEqual(catHotelQuote("2026-10-28", "2026-10-30", 1, true), { ok: true, days: 3, lateDay: true, total: 30 });
  assert.deepEqual(catHotelQuote("2026-10-28", "2026-10-28", 1, false), { ok: true, days: 1, lateDay: false, total: 10 });
});

test("Cat Hotel: no Sunday check-in/out, no backwards dates", () => {
  assert.equal(catHotelQuote("2026-11-01", "2026-11-03", 1, false).ok, false); // Sunday check-in
  assert.equal(catHotelQuote("2026-10-30", "2026-11-01", 1, false).ok, false); // Sunday check-out
  assert.equal(catHotelQuote("2026-10-30", "2026-10-28", 1, false).ok, false);
});
