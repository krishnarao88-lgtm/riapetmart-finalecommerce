import assert from "node:assert/strict";
import { test } from "node:test";
import { periodRange, summarise } from "../src/lib/dashboard.ts";

// 2026-09-25 10:00 in Kuala Lumpur (a Friday).
const now = new Date("2026-09-25T02:00:00Z");

test("periods are Malaysia calendar days", () => {
  const today = periodRange("today", undefined, undefined, now);
  assert.equal(today.start.toISOString(), "2026-09-24T16:00:00.000Z");
  assert.deepEqual(today.days, ["2026-09-25"]);
  assert.equal(periodRange("week", undefined, undefined, now).days[0], "2026-09-21"); // Monday
  assert.equal(periodRange("month", undefined, undefined, now).days.length, 25);
  const custom = periodRange("custom", "2026-09-10", "2026-09-01", now);
  assert.deepEqual([custom.days[0], custom.days.at(-1), custom.days.length], ["2026-09-01", "2026-09-10", 10]);
});

test("summarise: revenue, fee estimate, profit only where cost is known", () => {
  const s = summarise(
    [
      {
        created_at: "2026-09-24T17:30:00Z", // 25 Sep 01:30 in KL
        total: 100,
        shipping_cost: 8,
        fulfilment_status: "new",
        items: [
          { variant_id: "a", name: "Food", title: "2kg", qty: 2, price: 30 },
          { variant_id: "b", name: "Treat", title: "100g", qty: 1, price: 32 },
        ],
      },
    ],
    new Map([["a", 20]]),
    ["2026-09-24", "2026-09-25"],
  );
  assert.equal(s.gross, 100);
  assert.equal(s.fees, 4); // 3% + RM1
  assert.equal(s.profit, 16); // (30-20)*2 - 4
  assert.equal(s.costMissing, 1);
  assert.equal(s.toShip, 1);
  assert.deepEqual(s.byDay, [{ day: "2026-09-24", total: 0 }, { day: "2026-09-25", total: 100 }]);
  assert.equal(s.topProducts[0].name, "Food");
});
