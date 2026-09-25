import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deliveryCharge,
  marginFromPrice,
  markupFromPrice,
  MAX_MARGIN,
  priceFromMargin,
  profitPerUnit,
} from "../src/lib/pricing.ts";

test("price rounds up to the next 10 sen", () => {
  // Real catalogue row: Alps Natural Nourish Lamb 4kg, cost RM 45.00 at 19% margin + 3% card fee = 57.69…
  assert.equal(priceFromMargin(45, 0.19), 57.7);
  assert.equal(priceFromMargin(2, 0.285), 3);
  assert.equal(priceFromMargin(3.43, 0.2854), 5.1);
});

test("zero margin sells at cost plus the card fee, and a 0 cost is free", () => {
  assert.equal(priceFromMargin(12.34, 0), 12.8);
  assert.equal(priceFromMargin(0, 0.3), 0);
});

test("margin and markup are different numbers for the same price", () => {
  // Both are after the 3% card fee: RM13 keeps 12.61, so 2.61 profit.
  assert.equal(marginFromPrice(10, 14.29), 0.2702);
  assert.equal(markupFromPrice(10, 13), 0.261);
  assert.equal(marginFromPrice(10, 13), 0.2008);
});

test("a hand-typed price below cost reports a negative margin", () => {
  assert.equal(marginFromPrice(10, 8), -0.28);
  assert.equal(profitPerUnit(10, 8), -2.24);
});

test("impossible inputs are refused instead of guessed", () => {
  assert.throws(() => priceFromMargin(10, MAX_MARGIN), RangeError);
  assert.throws(() => priceFromMargin(10, 1), RangeError);
  assert.throws(() => priceFromMargin(-1, 0.2), RangeError);
  assert.throws(() => priceFromMargin(10, Number.NaN), RangeError);
  assert.equal(marginFromPrice(10, 0), null);
  assert.equal(markupFromPrice(0, 10), null);
});

test("a custom rounding step is honoured", () => {
  assert.equal(priceFromMargin(45, 0.19, 0.05), 57.7);
  assert.equal(priceFromMargin(45, 0.19, 1), 58);
  assert.equal(priceFromMargin(45, 0.19, 0), 57.69);
});

test("deliveryCharge: full price under the minimum, capped allowance over it", () => {
  assert.equal(deliveryCharge(12, 100, 150, 15), 12);
  assert.equal(deliveryCharge(12, 150, 150, 15), 0);
  // 5 heavy bags: RM105 courier, we cover RM15, customer pays RM90
  assert.equal(deliveryCharge(105, 360, 150, 15), 90);
  assert.equal(deliveryCharge(105, 360, 150, null), 0);
  assert.equal(deliveryCharge(105, 360, null, 15), 105);
});
