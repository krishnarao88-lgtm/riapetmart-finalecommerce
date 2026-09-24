import assert from "node:assert/strict";
import { test } from "node:test";
import { daysUntil, discountedPrice, getExpiryBadge } from "../src/lib/expiry.ts";

const fixedNow = new Date("2026-01-01T00:00:00Z");
const isoFrom = (base: Date, daysFromNow: number) => new Date(base.getTime() + daysFromNow * 86_400_000).toISOString();

// daysUntil accepts an explicit reference date, so it's testable against a fixed point in time.
test("daysUntil counts whole days from the reference date", () => {
  assert.equal(daysUntil(isoFrom(fixedNow, 10), fixedNow), 10);
  assert.equal(daysUntil(isoFrom(fixedNow, 0), fixedNow), 0);
  assert.equal(daysUntil(isoFrom(fixedNow, -5), fixedNow), -5);
});

// getExpiryBadge always measures against the real wall-clock "now" (no override param),
// so its tests below build dates relative to the real current time instead.
const iso = (daysFromNow: number) => isoFrom(new Date(), daysFromNow);

test("null expiry gets no badge", () => {
  assert.equal(getExpiryBadge(null), null);
});

test("within the short-dated window gets a discount badge", () => {
  const badge = getExpiryBadge(iso(30), { short_dated: [{ max_days: 90, discount: 0.15 }] }, );
  assert.deepEqual(badge, { kind: "short-dated", discount: 0.15, daysLeft: 30 });
});

test("far enough out gets the fresh badge", () => {
  const badge = getExpiryBadge(iso(200), { fresh_min_days: 181 });
  assert.deepEqual(badge, { kind: "fresh", daysLeft: 200 });
});

test("in between short-dated and fresh gets no badge", () => {
  const badge = getExpiryBadge(iso(120), { short_dated: [{ max_days: 90, discount: 0.15 }], fresh_min_days: 181 });
  assert.equal(badge, null);
});

test("multiple tiers pick the smallest max_days that still covers daysLeft", () => {
  const settings = { short_dated: [{ max_days: 90, discount: 0.15 }, { max_days: 30, discount: 0.3 }] };
  assert.deepEqual(getExpiryBadge(iso(10), settings), { kind: "short-dated", discount: 0.3, daysLeft: 10 });
  assert.deepEqual(getExpiryBadge(iso(60), settings), { kind: "short-dated", discount: 0.15, daysLeft: 60 });
});

test("already expired still counts as short-dated, not a special case", () => {
  const badge = getExpiryBadge(iso(-5), { short_dated: [{ max_days: 90, discount: 0.15 }] });
  assert.deepEqual(badge, { kind: "short-dated", discount: 0.15, daysLeft: -5 });
});

test("discountedPrice rounds to the nearest cent", () => {
  assert.equal(discountedPrice(10, 0.15), 8.5);
  assert.equal(discountedPrice(4.8, 0.15), 4.08);
  assert.equal(discountedPrice(2.38, 0), 2.38);
});
