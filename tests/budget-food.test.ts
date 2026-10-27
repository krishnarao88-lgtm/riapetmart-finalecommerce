import assert from "node:assert/strict";
import { test } from "node:test";
import { cheapestBigBags, kgOf } from "../src/lib/budget-food.ts";

test("bag size from size option or product name", () => {
  assert.equal(kgOf("15 kg", "Alps"), 15);
  assert.equal(kgOf("Bag", "IQ DOG LAMB FLAVOUR (13.5KG)"), 13.5);
  assert.equal(kgOf("Bag", "Wanpy biscuits 230G"), null);
});

test("cheapest in-stock big bags per kg, one per product", () => {
  const rows = [
    { slug: "a", name: "A 20KG", title: "Bag", price: 132.9, available: 2 },
    { slug: "b", name: "B", title: "15 kg", price: 82.7, available: 3 },
    { slug: "c", name: "C", title: "15 kg", price: 69.9, available: 0 }, // sold out
    { slug: "d", name: "D", title: "4 kg", price: 20, available: 5 }, // small bag
    { slug: "b", name: "B", title: "18 kg", price: 120, available: 1 }, // same product, dearer per kg
  ];
  assert.deepEqual(cheapestBigBags(rows).map((b) => [b.slug, b.perKg]), [["b", 5.51], ["a", 6.65]]);
});
