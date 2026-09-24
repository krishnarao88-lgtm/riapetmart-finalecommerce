import assert from "node:assert/strict";
import { test } from "node:test";
import { searchTerm, sortByPrice } from "../src/lib/shop-search.ts";

test("search term drops PostgREST or() syntax and ilike wildcards", () => {
  assert.equal(searchTerm("royal canin"), "royal canin");
  assert.equal(searchTerm("  a,b)or(id.eq.1  "), "a b or id.eq.1");
  assert.equal(searchTerm('100% "kitten"_food*'), "100 kitten food");
  assert.equal(searchTerm(undefined), "");
  assert.equal(searchTerm("%%%"), "");
});

test("price sort uses each product's cheapest variant and keeps unpriced products last", () => {
  const rows = [
    { name: "B", variants: [{ price: 30 }, { price: 12 }] },
    { name: "None", variants: [] },
    { name: "A", variants: [{ price: 20 }] },
  ];
  assert.deepEqual(sortByPrice(rows, "price-asc").map((r) => r.name), ["B", "A", "None"]);
  assert.deepEqual(sortByPrice(rows, "price-desc").map((r) => r.name), ["A", "B", "None"]);
  assert.equal(sortByPrice(rows, undefined), rows);
});
