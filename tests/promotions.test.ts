import assert from "node:assert/strict";
import { test } from "node:test";
import { todayInKL } from "../src/lib/kl-time.ts";
import { type Promotion, promoFor } from "../src/lib/promotions.ts";

const base = { id: "", brand_id: null, category_id: null, banner: null };
const deepavali: Promotion = { ...base, id: "d", name: "Deepavali Sale", starts_on: "2026-11-04", ends_on: "2026-11-09", discount: 0.1, scope: "house" };
const storewide: Promotion = { ...base, id: "s", name: "11.11", starts_on: "2026-11-11", ends_on: "2026-11-11", discount: 0.11, scope: "all" };
const house = { brand_id: "a", category_id: "x", house: true };
const other = { brand_id: "b", category_id: "x", house: false };

test("a sale applies only inside its dates, inclusive", () => {
  assert.equal(promoFor(house, [deepavali], "2026-11-03"), null);
  assert.equal(promoFor(house, [deepavali], "2026-11-04")?.id, "d");
  assert.equal(promoFor(house, [deepavali], "2026-11-09")?.id, "d");
  assert.equal(promoFor(house, [deepavali], "2026-11-10"), null);
});

test("own-brand sales skip other brands; storewide covers everyone", () => {
  assert.equal(promoFor(other, [deepavali], "2026-11-05"), null);
  assert.equal(promoFor(other, [storewide], "2026-11-11")?.id, "s");
});

test("Malaysia's date rolls over at 4pm UTC", () => {
  assert.equal(todayInKL(new Date("2026-11-03T15:59:00Z")), "2026-11-03");
  assert.equal(todayInKL(new Date("2026-11-03T16:00:00Z")), "2026-11-04");
});
