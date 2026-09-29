import assert from "node:assert/strict";
import { test } from "node:test";
import { lalamoveDelivery } from "../src/lib/shipping/lalamove-rules.ts";

// Times are Malaysia (UTC+8). 1 Oct 2026 is a Thursday.
const my = (iso: string) => new Date(`${iso}+08:00`);

test("same-day only before 1pm, Monday to Saturday", () => {
  assert.equal(lalamoveDelivery(my("2026-10-01T12:59:00")).sameDay, true);
  assert.equal(lalamoveDelivery(my("2026-10-01T13:00:00")).sameDay, false);
  assert.equal(lalamoveDelivery(my("2026-10-03T09:00:00")).sameDay, true); // Saturday morning
  assert.equal(lalamoveDelivery(my("2026-10-04T09:00:00")).sameDay, false); // Sunday
});

test("after the cut-off it says when it will arrive, skipping Sunday", () => {
  assert.match(lalamoveDelivery(my("2026-10-01T15:00:00")).label, /arrives tomorrow/); // Thu → Fri
  assert.match(lalamoveDelivery(my("2026-10-03T15:00:00")).label, /arrives Monday/); // Sat → Mon
  assert.match(lalamoveDelivery(my("2026-10-04T10:00:00")).label, /arrives tomorrow/); // Sun → Mon
  assert.match(lalamoveDelivery(my("2026-10-01T10:00:00")).label, /delivery fee back/);
});
