import assert from "node:assert/strict";
import { test } from "node:test";
import { byMonth, dashMarks, lastMonths, pctChange, periodRange, summarise, timeAgo } from "../src/lib/dashboard.ts";

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

test("month helpers, change and relative time", () => {
  // 1 Mar 2026 07:00 KL is still 28 Feb in UTC.
  assert.deepEqual(lastMonths(3, new Date("2026-02-28T23:00:00Z")), ["2026-01", "2026-02", "2026-03"]);
  const m = dashMarks(new Date("2026-03-31T02:00:00Z")); // 31 Mar 10:00 KL
  assert.equal(m.thisMonth.toISOString(), "2026-02-28T16:00:00.000Z");
  assert.equal(m.lastMonth.toISOString(), "2026-01-31T16:00:00.000Z");
  assert.equal(m.lastToDate.toISOString(), m.thisMonth.toISOString()); // clamped to end of Feb
  assert.equal(pctChange(150, 100), 50);
  assert.equal(pctChange(5, 0), null);
  const rows = byMonth(
    [
      { created_at: "2026-02-28T17:00:00Z", total: 10 }, // 1 Mar KL
      { created_at: "2026-02-27T10:00:00Z", total: 5 },
      { created_at: "2025-01-01T00:00:00Z", total: 99 }, // outside
    ],
    ["2026-02", "2026-03"],
  );
  assert.deepEqual(rows, [
    { month: "2026-02", revenue: 5, orders: 1 },
    { month: "2026-03", revenue: 10, orders: 1 },
  ]);
  const now = new Date("2026-03-10T00:00:00Z");
  assert.equal(timeAgo("2026-03-09T23:55:00Z", now), "5 min ago");
  assert.equal(timeAgo("2026-03-08T00:00:00Z", now), "2 d ago");
});
