import assert from "node:assert/strict";
import { test } from "node:test";
import { fulfilmentForEasyParcel } from "../src/lib/shipping/easyparcel-status.ts";

test("courier progress moves the order forward, never back", () => {
  assert.equal(fulfilmentForEasyParcel(3, "new"), "shipped");
  assert.equal(fulfilmentForEasyParcel(5, "shipped"), "delivered");
  assert.equal(fulfilmentForEasyParcel(4, "delivered"), null); // no going back
  assert.equal(fulfilmentForEasyParcel(7, "new"), "packed");
});

test("cancelled, returned and on-hold shipments don't change the step; owner-cancelled/refunded orders are left alone", () => {
  assert.equal(fulfilmentForEasyParcel(0, "shipped"), null);
  assert.equal(fulfilmentForEasyParcel(6, "shipped"), null);
  assert.equal(fulfilmentForEasyParcel(5, "refunded"), null);
  assert.equal(fulfilmentForEasyParcel(5, "cancelled"), null);
});
