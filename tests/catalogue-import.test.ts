import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCatalogue, parseExpiry, slugify } from "../src/lib/catalogue-import.ts";

const base = {
  source_ref: "RPM-TEST-0001",
  product_name: "ALPS CHUNKY LAMB 415GM",
  brand: "Alps",
  category: "Wet Food",
  pet_type: "Dog",
  size_display: "415G",
  sku: "RPM-TEST-0001-V1",
  variant_title: "Single Unit - 1 Can",
  unit_multiplier: 1,
  cost_price: "RM3.43",
  sale_price: "RM4.80",
  stock_qty: 12,
  expiry_date: "14/9/2027",
};

test("dates arrive in three shapes and all land on the same day", () => {
  assert.equal(parseExpiry("14/9/2027"), "2027-09-14");
  assert.equal(parseExpiry("2027-09-14"), "2027-09-14");
  assert.equal(parseExpiry(new Date("2027-09-14T00:00:00Z")), "2027-09-14");
  assert.equal(parseExpiry(""), null);
  assert.equal(parseExpiry("Sept 2027"), null); // month only: no day to trust
  assert.equal(parseExpiry("31/2/2027"), "invalid"); // February has no 31st
  assert.equal(parseExpiry("14/13/2027"), "invalid");
  assert.equal(parseExpiry("next week"), "invalid");
});

test("a clean row becomes one product with one variant and a stock batch", () => {
  const { products, issues, variantCount } = parseCatalogue([base]);
  assert.deepEqual(issues, []);
  assert.equal(variantCount, 1);
  assert.equal(products.length, 1);
  const [product] = products;
  assert.equal(product.petType, "dog");
  assert.equal(product.status, "draft"); // never publish by surprise
  assert.equal(product.slug, "alps-chunky-lamb-415gm");
  assert.equal(product.variants[0].price, 4.8);
  assert.equal(product.variants[0].cost, 3.43);
  assert.equal(product.variants[0].stock, 12);
  assert.equal(product.variants[0].expiry, "2027-09-14");
});

test("rows sharing a source ref group into one product with several variants", () => {
  const { products, variantCount } = parseCatalogue([
    base,
    { ...base, sku: "RPM-TEST-0001-V2", variant_title: "3 Unit - 3 Can", unit_multiplier: 3, sale_price: 14 },
    { ...base, sku: "RPM-TEST-0001-V3", variant_title: "24 Unit - 1 Carton", unit_multiplier: 24, sale_price: 110 },
  ]);
  assert.equal(products.length, 1);
  assert.equal(variantCount, 3);
  assert.deepEqual(
    products[0].variants.map((v) => v.unitMultiplier),
    [1, 3, 24],
  );
});

test("a missing sale price is worked out from cost and margin", () => {
  const { products } = parseCatalogue([{ ...base, sale_price: "", margin_percent: 19, cost_price: 45 }]);
  assert.equal(products[0].variants[0].price, 55.6);
  assert.equal(products[0].variants[0].margin, 0.19);
});

test("bad rows are reported with their row number and skipped, good rows still import", () => {
  const { products, issues } = parseCatalogue([
    base,
    { ...base, sku: "" },
    { ...base, sku: "RPM-TEST-0001-V1" }, // duplicate SKU
    { ...base, sku: "X2", pet_type: "Parrot" },
    { ...base, sku: "X3", sale_price: "", cost_price: "" },
    { ...base, sku: "X4", expiry_date: "31/2/2027" },
    { ...base, sku: "X5", stock_qty: -3 },
    { product_name: "", sku: "X6" },
  ]);
  assert.equal(products.length, 1);
  assert.equal(issues.length, 7);
  assert.deepEqual(
    issues.map((i) => [i.row, i.field]),
    [
      [3, "sku"],
      [4, "sku"],
      [5, "pet_type"],
      [6, "sale_price"],
      [7, "expiry_date"],
      [8, "stock_qty"],
      [9, "product_name"],
    ],
  );
});

test("duplicate product names get distinct slugs", () => {
  const { products } = parseCatalogue([
    { ...base, source_ref: "A", sku: "A1", size_display: "" },
    { ...base, source_ref: "B", sku: "B1", size_display: "" },
  ]);
  assert.deepEqual(
    products.map((p) => p.slug),
    ["alps-chunky-lamb-415gm", "alps-chunky-lamb-415gm-2"],
  );
});

test("slugify strips punctuation and casing", () => {
  assert.equal(
    slugify("ARISTOCAT PREMIUM PLUS (CHICKEN & TILAPIA) 80G"),
    "aristocat-premium-plus-chicken-tilapia-80g",
  );
});
