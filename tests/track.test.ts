import assert from "node:assert/strict";
import { test } from "node:test";
import { track } from "../src/lib/track.ts";

test("purchase sends GA4 ecommerce params and a deduplicable Pixel event", () => {
  const calls: unknown[][] = [];
  (globalThis as { window?: unknown }).window = {
    gtag: (...a: unknown[]) => calls.push(["gtag", ...a]),
    fbq: (...a: unknown[]) => calls.push(["fbq", ...a]),
  };
  const items = [{ item_id: "v1", item_name: "Kibble", price: 10.1, quantity: 3 }];
  track("purchase", items, { value: 38.3, transactionId: "order-1" });
  assert.deepEqual(calls[0], [
    "gtag",
    "event",
    "purchase",
    { currency: "MYR", value: 38.3, items, transaction_id: "order-1" },
  ]);
  assert.equal(calls[1][2], "Purchase");
  assert.deepEqual(calls[1][4], { eventID: "order-1" });

  calls.length = 0;
  track("add_to_cart", items);
  assert.equal((calls[0][3] as { value: number }).value, 30.3);
  assert.equal(calls[1].length, 4);
  delete (globalThis as { window?: unknown }).window;
});
