import assert from "node:assert/strict";
import { test } from "node:test";
import { goalPace } from "../src/lib/goal.ts";

test("goal pace: net of refunds, daily need, last-7-day pace and projection", () => {
  const goal = { target: 1000, end: "2026-01-11T00:00:00Z", label: "t" };
  const now = new Date("2026-01-01T00:00:00Z");
  const p = goalPace(
    [
      { total: 100, refunded: 0, created_at: "2025-12-30T00:00:00Z" },
      { total: 150, refunded: 50, created_at: "2025-12-31T00:00:00Z" },
      { total: 300, refunded: 0, created_at: "2025-12-01T00:00:00Z" }, // older than 7 days
    ],
    now,
    goal,
  );
  assert.equal(p.sold, 500);
  assert.equal(p.daysLeft, 10);
  assert.equal(p.needPerDay, 50);
  assert.equal(p.aov, 500 / 3);
  assert.equal(p.pacePerDay, 200 / 7);
  assert.equal(Math.round(p.projected), 786);
  assert.equal(p.gap, 50 / (200 / 7));
});

test("goal pace: no orders yet does not divide by zero", () => {
  const p = goalPace([], new Date("2026-01-01T00:00:00Z"), { target: 100, end: "2026-01-02T00:00:00Z", label: "t" });
  assert.equal(p.needOrdersPerDay, null);
  assert.equal(p.gap, null);
  assert.equal(p.needPerDay, 100);
});
