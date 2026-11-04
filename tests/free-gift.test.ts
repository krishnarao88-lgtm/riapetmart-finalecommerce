import assert from "node:assert/strict";
import { test } from "node:test";
import { giftKindFor, pickGift, shortDate, todayMY } from "../src/lib/free-gift.ts";

const setting = {
  enabled: true,
  ends_on: "2026-11-12",
  cat: { label: "Aristocat can", variant_ids: ["a", "b", "c"] },
  dog: { label: "Sniffly pouch", variant_ids: ["d"] },
};
const stock = [
  { variant_id: "a", available: 0, nearest_expiry: "2026-11-08" }, // sold out
  { variant_id: "b", available: 5, nearest_expiry: "2026-11-10" },
  { variant_id: "c", available: 9, nearest_expiry: "2026-11-09" }, // soonest in stock
  { variant_id: "d", available: 10, nearest_expiry: "2027-02-14" },
  { variant_id: "x", available: 50, nearest_expiry: "2026-11-01" }, // not a gift item
];

test("cat gift is the in-stock can expiring soonest; dog gift from its own list", () => {
  assert.equal(pickGift(setting, stock, "2026-11-05", "cat")?.variantId, "c");
  assert.equal(pickGift(setting, stock, "2026-11-05", "dog")?.variantId, "d");
});

test("which gift: dog only for dog-only carts", () => {
  assert.equal(giftKindFor(["dog"]), "dog");
  assert.equal(giftKindFor(["dog", "dog_cat"]), "dog");
  assert.equal(giftKindFor(["cat", "dog"]), "cat"); // mixed → one cat can
  assert.equal(giftKindFor(["dog_cat"]), "cat");
});

test("no gift when off, over, or sold out", () => {
  assert.equal(pickGift({ ...setting, enabled: false }, stock, "2026-11-05", "cat"), null);
  assert.equal(pickGift(setting, stock, "2026-11-13", "cat"), null);
  assert.equal(pickGift(setting, stock.map((s) => ({ ...s, available: 0 })), "2026-11-05", "dog"), null);
  assert.equal(pickGift(null, stock, "2026-11-05", "cat"), null);
});

test("dates", () => {
  assert.equal(todayMY(new Date("2026-11-04T17:00:00Z")), "2026-11-05");
  assert.equal(shortDate("2026-11-08"), "8 Nov");
});
