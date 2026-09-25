import assert from "node:assert/strict";
import { test } from "node:test";
import { moneySummary, productScenarios, safePrice, unitProfit } from "../src/lib/finance.ts";

test("unitProfit takes the 3% card fee off the price", () => {
  // IQ Dog 15 kg: RM74.30 at cost RM58.76 → 72.07 kept → RM13.31
  assert.equal(unitProfit(74.3, 58.76), 13.31);
  assert.equal(unitProfit(72, 58.76), 11.08);
});

test("productScenarios flags the worst case: biggest discount plus a sign-up code", () => {
  const rows = productScenarios(28.5, 25.42, { clearance: [0.15], bundle: null, sale: 0.05, welcome: 0.1 });
  assert.deepEqual(rows.map((r) => r.label), ["Full price", "Clearance -15%", "Sale -5%", "Worst: -15% + sign-up 10%"]);
  assert.ok(rows[0].profit > 0);
  assert.ok(rows[1].profit < 0);
  assert.equal(rows[3].price, 21.8);
});

test("moneySummary splits discounts, codes, costs and fees", () => {
  const s = moneySummary(
    [
      {
        total: 115,
        shipping_cost: 10,
        code_discount: 10.5,
        items: [
          { variant_id: "a", qty: 2, price: 42.5, list_price: 50, discount: "short-dated" },
          { variant_id: "b", qty: 1, price: 20, list_price: 20, discount: null },
        ],
      },
      { total: 30, shipping_cost: 0, code_discount: null, items: [{ variant_id: "b", qty: 1, price: 30 }] },
    ],
    new Map([["a", 30], ["b", 12]]),
  );
  assert.equal(s.discounts.clearance, 15);
  assert.equal(s.codes, 10.5);
  assert.equal(s.collected, 134.5);
  assert.equal(s.productCost, 84);
  assert.equal(s.fees, 6.35);
  assert.equal(s.profit, 34.15);
  assert.equal(s.unknownDiscountOrders, 1);
});

test("codes that can't stack only take the sign-up % off full price", () => {
  const rows = productScenarios(28.5, 25.42, { clearance: [0.15], bundle: null, sale: null, welcome: 0.1, stack: false });
  assert.equal(rows.at(-1)?.label, "Sign-up code -10%");
  assert.equal(rows.at(-1)?.price, 25.65);
});

test("safePrice keeps 5% after the card fee at the deepest discount", () => {
  // cost 24.25, clearance 15%: 24.25 / (0.85 × 0.92) = 31.01… → RM31.10
  assert.equal(safePrice(24.25, 0.15), 31.1);
  const p = safePrice(24.25, 0.15);
  assert.ok((p * 0.85 * 0.97 - 24.25) / (p * 0.85) >= 0.05);
});
