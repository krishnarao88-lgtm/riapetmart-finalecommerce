import assert from "node:assert/strict";
import { test } from "node:test";
import { bulkSavings, courierWindow, unitsOf } from "../src/lib/buy-boosters.ts";

test("units from size options", () => {
  assert.deepEqual(unitsOf("24 Unit - 1 Carton"), { n: 24, kind: "count" });
  assert.deepEqual(unitsOf("Single Unit - 1 Can"), { n: 1, kind: "count" });
  assert.deepEqual(unitsOf("Box (6 Tablets)"), { n: 6, kind: "count" });
  assert.deepEqual(unitsOf("1 Chewable"), { n: 1, kind: "count" });
  assert.deepEqual(unitsOf("15 kg"), { n: 15, kind: "kg" });
  assert.equal(unitsOf("Bag"), null);
});

test("bulk savings per unit, only within the same kind", () => {
  const s = bulkSavings([
    { id: "can", title: "Single Unit - 1 Can", price: 4.8 },
    { id: "carton", title: "24 Unit - 1 Carton", price: 100.8 }, // 4.20 a can vs 4.80 → 12.5%, shown as 12%
    { id: "4kg", title: "4 kg", price: 62.5 },
    { id: "15kg", title: "15 kg", price: 174 }, // 11.60/kg vs 15.63 → 26% off
  ]);
  assert.equal(s.get("carton"), 12);
  assert.equal(s.get("15kg"), 26);
  assert.equal(s.has("can"), false);
  assert.equal(bulkSavings([{ id: "a", title: "Bag", price: 10 }]).size, 0);
});

test("courier window skips Sundays", () => {
  // Fri 6 Nov 2026, 10:00 Malaysia → shop days Sat 7, Mon 9, Tue 10, Wed 11 → "Mon 9 Nov – Wed 11 Nov"
  assert.equal(courierWindow(new Date("2026-11-06T02:00:00Z")), "Mon 9 Nov – Wed 11 Nov");
});
