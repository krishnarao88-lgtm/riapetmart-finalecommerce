import assert from "node:assert/strict";
import { test } from "node:test";
import { fulfilmentForLalamove, toE164MY } from "../src/lib/shipping/lalamove-rules.ts";

test("toE164MY normalises Malaysian mobiles", () => {
  assert.equal(toE164MY("012-345 6789"), "+60123456789");
  assert.equal(toE164MY("+60 19-611 2848"), "+60196112848");
  assert.equal(toE164MY("60111234 5678"), "+601112345678");
  assert.equal(toE164MY("03-1234 5678"), null);
  assert.equal(toE164MY("abc"), null);
});

test("fulfilmentForLalamove never regresses on failure", () => {
  assert.equal(fulfilmentForLalamove("PICKED_UP"), "shipped");
  assert.equal(fulfilmentForLalamove("COMPLETED"), "delivered");
  assert.equal(fulfilmentForLalamove("CANCELED"), null);
});
