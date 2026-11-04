import assert from "node:assert/strict";
import { test } from "node:test";
import { pickGift, shortDate, todayMY } from "../src/lib/free-gift.ts";

const setting = { enabled: true, ends_on: "2026-11-12", label: "Aristocat can", variant_ids: ["a", "b", "c"] };
const stock = [
  { variant_id: "a", available: 0, nearest_expiry: "2026-11-08" }, // sold out
  { variant_id: "b", available: 5, nearest_expiry: "2026-11-10" },
  { variant_id: "c", available: 9, nearest_expiry: "2026-11-09" }, // soonest in stock
  { variant_id: "x", available: 50, nearest_expiry: "2026-11-01" }, // not a gift item
];

test("gift is the in-stock can expiring soonest", () => {
  assert.equal(pickGift(setting, stock, "2026-11-05")?.variantId, "c");
  assert.equal(pickGift(setting, stock, "2026-11-05")?.bestBefore, "2026-11-09");
});

test("no gift when off, over, or sold out", () => {
  assert.equal(pickGift({ ...setting, enabled: false }, stock, "2026-11-05"), null);
  assert.equal(pickGift(setting, stock, "2026-11-13"), null);
  assert.equal(pickGift(setting, stock.map((s) => ({ ...s, available: 0 })), "2026-11-05"), null);
  assert.equal(pickGift(null, stock, "2026-11-05"), null);
});

test("dates", () => {
  assert.equal(todayMY(new Date("2026-11-04T17:00:00Z")), "2026-11-05"); // 1am Malaysia
  assert.equal(shortDate("2026-11-08"), "8 Nov");
});
