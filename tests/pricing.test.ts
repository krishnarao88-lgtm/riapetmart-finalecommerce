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
  // Real catalogue row: Alps Natural Nourish Lamb 4kg, cost RM 45.00 at 19% margin = 55.5555…
  assert.equal(priceFromMargin(45, 0.19), 55.6);
  assert.equal(priceFromMargin(2, 0.285), 2.8);
  assert.equal(priceFromMargin(3.43, 0.2854), 4.8);
});

test("zero margin sells at cost, and a 0 cost is free", () => {
  assert.equal(priceFromMargin(12.34, 0), 12.4);
  assert.equal(priceFromMargin(0, 0.3), 0);
});

test("margin and markup are different numbers for the same price", () => {
  assert.equal(marginFromPrice(10, 14.29), 0.3002);
  assert.equal(markupFromPrice(10, 13), 0.3);
  assert.equal(marginFromPrice(10, 13), 0.2308);
});

test("a hand-typed price below cost reports a negative margin", () => {
  assert.equal(marginFromPrice(10, 8), -0.25);
  assert.equal(profitPerUnit(10, 8), -2);
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
  assert.equal(priceFromMargin(45, 0.19, 0.05), 55.6);
  assert.equal(priceFromMargin(45, 0.19, 1), 56);
  assert.equal(priceFromMargin(45, 0.19, 0), 55.56);
});

test("deliveryCharge: full price under the minimum, capped allowance over it", () => {
  assert.equal(deliveryCharge(12, 100, 150, 15), 12);
  assert.equal(deliveryCharge(12, 150, 150, 15), 0);
  // 5 heavy bags: RM105 courier, we cover RM15, customer pays RM90
  assert.equal(deliveryCharge(105, 360, 150, 15), 90);
  assert.equal(deliveryCharge(105, 360, 150, null), 0);
  assert.equal(deliveryCharge(105, 360, null, 15), 105);
});
